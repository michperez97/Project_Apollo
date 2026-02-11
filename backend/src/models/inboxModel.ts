import pool from '../config/database';
import { UserRole } from '../types/user';

export interface InboxUserSummary {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

export interface ConversationListItem {
  id: number;
  course_id: number | null;
  course_title: string | null;
  subject: string | null;
  created_at: Date;
  updated_at: Date;
  last_message_body: string | null;
  last_message_at: Date | null;
  last_message_sender_id: number | null;
  participants: InboxUserSummary[];
  unread_count: number;
}

type ConversationListRow = Omit<ConversationListItem, 'participants' | 'unread_count'> & {
  participants: InboxUserSummary[] | null;
  unread_count: number | string | null;
};

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_first_name: string;
  sender_last_name: string;
  sender_role: UserRole;
  body: string;
  created_at: Date;
}

export const isUserConversationParticipant = async (
  conversationId: number,
  userId: number
): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1
      FROM conversation_participants
      WHERE conversation_id = $1 AND user_id = $2
    ) AS exists`,
    [conversationId, userId]
  );
  return Boolean(result.rows[0]?.exists);
};

export const listConversationsForUser = async (
  userId: number,
  limit = 50
): Promise<ConversationListItem[]> => {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  const result = await pool.query<ConversationListRow>(
    `
    WITH participation AS (
      SELECT conversation_id, last_read_at
      FROM conversation_participants
      WHERE user_id = $1 AND is_archived = false
    )
    SELECT
      c.id,
      c.course_id,
      crs.title AS course_title,
      c.subject,
      c.created_at,
      c.updated_at,
      last_msg.body AS last_message_body,
      last_msg.created_at AS last_message_at,
      last_msg.sender_id AS last_message_sender_id,
      COALESCE(unread.unread_count, 0) AS unread_count,
      COALESCE(participants.participants, '[]'::json) AS participants
    FROM participation p
    JOIN conversations c ON c.id = p.conversation_id
    LEFT JOIN courses crs ON crs.id = c.course_id
    LEFT JOIN LATERAL (
      SELECT m.body, m.created_at, m.sender_id
      FROM conversation_messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) last_msg ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM conversation_messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> $1
        AND (p.last_read_at IS NULL OR m.created_at > p.last_read_at)
    ) unread ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'id', u.id,
          'email', u.email,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'role', u.role
        )
        ORDER BY u.last_name, u.first_name
      ) AS participants
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.conversation_id = c.id AND cp.user_id <> $1
    ) participants ON true
    ORDER BY last_msg.created_at DESC NULLS LAST, c.updated_at DESC
    LIMIT $2
    `,
    [userId, safeLimit]
  );

  return result.rows.map((row) => ({
    ...row,
    participants: row.participants ?? [],
    unread_count: typeof row.unread_count === 'string'
      ? Number(row.unread_count)
      : row.unread_count ?? 0
  }));
};

export const listMessagesForConversation = async (
  conversationId: number,
  limit = 100
): Promise<ConversationMessage[]> => {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const result = await pool.query<ConversationMessage>(
    `
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      u.first_name AS sender_first_name,
      u.last_name AS sender_last_name,
      u.role AS sender_role,
      m.body,
      m.created_at
    FROM conversation_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2
    `,
    [conversationId, safeLimit]
  );

  return result.rows;
};

export const markConversationRead = async (
  conversationId: number,
  userId: number
): Promise<void> => {
  await pool.query(
    `
    UPDATE conversation_participants
    SET last_read_at = CURRENT_TIMESTAMP
    WHERE conversation_id = $1 AND user_id = $2
    `,
    [conversationId, userId]
  );
};

export const sendConversationMessage = async (
  conversationId: number,
  senderId: number,
  body: string
): Promise<ConversationMessage> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query<ConversationMessage>(
      `
      INSERT INTO conversation_messages (conversation_id, sender_id, body)
      VALUES ($1, $2, $3)
      RETURNING id, conversation_id, sender_id, ''::text AS sender_first_name, ''::text AS sender_last_name, 'student'::text AS sender_role, body, created_at
      `,
      [conversationId, senderId, body]
    );

    await client.query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [conversationId]
    );

    await client.query(
      `
      UPDATE conversation_participants
      SET last_read_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversationId, senderId]
    );

    const enriched = await client.query<ConversationMessage>(
      `
      SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        u.first_name AS sender_first_name,
        u.last_name AS sender_last_name,
        u.role AS sender_role,
        m.body,
        m.created_at
      FROM conversation_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.id = $1
      LIMIT 1
      `,
      [inserted.rows[0].id]
    );

    await client.query('COMMIT');
    return enriched.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const findExistingDirectConversation = async (params: {
  userAId: number;
  userBId: number;
  courseId: number | null;
}): Promise<number | null> => {
  const { userAId, userBId, courseId } = params;
  const result = await pool.query<{ id: number }>(
    `
    SELECT c.id
    FROM conversations c
    WHERE c.course_id IS NOT DISTINCT FROM $3::int
      AND EXISTS (
        SELECT 1 FROM conversation_participants p
        WHERE p.conversation_id = c.id AND p.user_id = $1
      )
      AND EXISTS (
        SELECT 1 FROM conversation_participants p
        WHERE p.conversation_id = c.id AND p.user_id = $2
      )
      AND (
        SELECT COUNT(*)
        FROM conversation_participants p
        WHERE p.conversation_id = c.id
      ) = 2
    ORDER BY c.updated_at DESC
    LIMIT 1
    `,
    [userAId, userBId, courseId]
  );

  return result.rows[0]?.id ?? null;
};

export const createDirectConversationWithMessage = async (params: {
  courseId: number | null;
  subject: string | null;
  userAId: number;
  userBId: number;
  senderId: number;
  body: string;
}): Promise<number> => {
  const { courseId, subject, userAId, userBId, senderId, body } = params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created = await client.query<{ id: number }>(
      `
      INSERT INTO conversations (course_id, subject)
      VALUES ($1, $2)
      RETURNING id
      `,
      [courseId, subject]
    );
    const conversationId = created.rows[0].id;

    await client.query(
      `
      INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
      VALUES
        ($1::int, $2::int, CASE WHEN $2::int = $4::int THEN CURRENT_TIMESTAMP ELSE NULL END),
        ($1::int, $3::int, CASE WHEN $3::int = $4::int THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [conversationId, userAId, userBId, senderId]
    );

    await client.query(
      `
      INSERT INTO conversation_messages (conversation_id, sender_id, body)
      VALUES ($1, $2, $3)
      `,
      [conversationId, senderId, body]
    );

    await client.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [
      conversationId
    ]);

    await client.query('COMMIT');
    return conversationId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const listMessageableStudentsForInstructor = async (
  instructorId: number
): Promise<InboxUserSummary[]> => {
  const result = await pool.query<InboxUserSummary>(
    `
    SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role
    FROM users u
    JOIN (
      SELECT e.student_id AS user_id
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      WHERE c.instructor_id = $1
      UNION
      SELECT su.student_id AS user_id
      FROM course_subscription_usage su
      JOIN courses c ON c.id = su.course_id
      WHERE c.instructor_id = $1
    ) ids ON ids.user_id = u.id
    WHERE u.role = 'student'
    ORDER BY u.last_name, u.first_name
    `,
    [instructorId]
  );
  return result.rows;
};

export const listMessageableInstructorsForStudent = async (
  studentId: number
): Promise<InboxUserSummary[]> => {
  const result = await pool.query<InboxUserSummary>(
    `
    SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role
    FROM users u
    JOIN (
      SELECT c.instructor_id AS user_id
      FROM courses c
      JOIN enrollments e ON e.course_id = c.id
      WHERE e.student_id = $1
      UNION
      SELECT c.instructor_id AS user_id
      FROM courses c
      JOIN course_subscription_usage su ON su.course_id = c.id
      WHERE su.student_id = $1
    ) ids ON ids.user_id = u.id
    WHERE u.role = 'instructor'
    ORDER BY u.last_name, u.first_name
    `,
    [studentId]
  );
  return result.rows;
};

export const canInstructorMessageStudent = async (
  instructorId: number,
  studentId: number
): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `
    SELECT EXISTS(
      SELECT 1
      FROM courses c
      WHERE c.instructor_id = $1
        AND (
          EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.student_id = $2
          )
          OR EXISTS (
            SELECT 1 FROM course_subscription_usage su
            WHERE su.course_id = c.id AND su.student_id = $2
          )
        )
    ) AS exists
    `,
    [instructorId, studentId]
  );
  return Boolean(result.rows[0]?.exists);
};

export const canInstructorMessageStudentInCourse = async (
  instructorId: number,
  studentId: number,
  courseId: number
): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `
    SELECT EXISTS(
      SELECT 1
      FROM courses c
      WHERE c.id = $3
        AND c.instructor_id = $1
        AND (
          EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.student_id = $2
          )
          OR EXISTS (
            SELECT 1 FROM course_subscription_usage su
            WHERE su.course_id = c.id AND su.student_id = $2
          )
        )
    ) AS exists
    `,
    [instructorId, studentId, courseId]
  );
  return Boolean(result.rows[0]?.exists);
};

export const canStudentMessageInstructor = async (
  studentId: number,
  instructorId: number
): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `
    SELECT EXISTS(
      SELECT 1
      FROM courses c
      WHERE c.instructor_id = $2
        AND (
          EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.student_id = $1
          )
          OR EXISTS (
            SELECT 1 FROM course_subscription_usage su
            WHERE su.course_id = c.id AND su.student_id = $1
          )
        )
    ) AS exists
    `,
    [studentId, instructorId]
  );
  return Boolean(result.rows[0]?.exists);
};
