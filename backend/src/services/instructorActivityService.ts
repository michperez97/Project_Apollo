import pool from '../config/database';

export type InstructorActivityType = 'SALE' | 'JOIN' | 'PROG' | 'RATE';

export interface InstructorActivityEvent {
  type: InstructorActivityType;
  student_name: string;
  course_title: string;
  timestamp: Date;
  value: string;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const clampLimit = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_LIMIT);
};

export const listInstructorActivityFeed = async (
  instructorId: number,
  limit?: number
): Promise<InstructorActivityEvent[]> => {
  const resolvedLimit = clampLimit(limit);

  const result = await pool.query<InstructorActivityEvent>(
    `WITH sale_events AS (
       SELECT
         'SALE'::text AS type,
         TRIM(student.first_name || ' ' || student.last_name) AS student_name,
         match.course_title,
         tx.created_at AS timestamp,
         CONCAT('+$', TO_CHAR(tx.amount, 'FM999999990.00')) AS value
       FROM transactions tx
       JOIN users student ON student.id = tx.student_id
       JOIN LATERAL (
         SELECT
           c.title AS course_title,
           e.enrolled_at
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE c.instructor_id = $1
           AND e.student_id = tx.student_id
           AND e.payment_status = 'paid'
           AND (
             e.tuition_amount = tx.amount
             OR (tx.description IS NOT NULL AND tx.description ILIKE ('%' || c.title || '%'))
           )
         ORDER BY ABS(EXTRACT(EPOCH FROM (e.enrolled_at - tx.created_at))) ASC
         LIMIT 1
       ) match ON TRUE
       WHERE tx.type = 'payment'
         AND tx.status = 'completed'
     ),
     join_events AS (
       SELECT
         'JOIN'::text AS type,
         TRIM(student.first_name || ' ' || student.last_name) AS student_name,
         c.title AS course_title,
         e.enrolled_at AS timestamp,
         CASE
           WHEN e.payment_status = 'paid' THEN 'Enrollment confirmed'
           WHEN e.payment_status = 'partial' THEN 'Enrollment partial'
           ELSE 'Enrollment pending'
         END AS value
       FROM enrollments e
       JOIN users student ON student.id = e.student_id
       JOIN courses c ON c.id = e.course_id
       WHERE c.instructor_id = $1
         AND e.payment_status <> 'pending'
     ),
     progress_events AS (
       SELECT
         'PROG'::text AS type,
         TRIM(student.first_name || ' ' || student.last_name) AS student_name,
         c.title AS course_title,
         COALESCE(sp.completed_at, sp.updated_at) AS timestamp,
         CONCAT('Completed "', lesson.title, '"') AS value
       FROM student_progress sp
       JOIN users student ON student.id = sp.student_id
       JOIN course_lessons lesson ON lesson.id = sp.lesson_id
       JOIN courses c ON c.id = lesson.course_id
       WHERE c.instructor_id = $1
         AND sp.status = 'completed'
     ),
     review_events AS (
       SELECT
         'RATE'::text AS type,
         TRIM(actor.first_name || ' ' || actor.last_name) AS student_name,
         c.title AS course_title,
         review.created_at AS timestamp,
         CASE
           WHEN review.action = 'approved' THEN '★★★★★'
           ELSE '★★☆☆☆'
         END AS value
       FROM course_reviews review
       JOIN users actor ON actor.id = review.admin_id
       JOIN courses c ON c.id = review.course_id
       WHERE c.instructor_id = $1
     )
     SELECT type, student_name, course_title, timestamp, value
     FROM (
       SELECT * FROM sale_events
       UNION ALL
       SELECT * FROM join_events
       UNION ALL
       SELECT * FROM progress_events
       UNION ALL
       SELECT * FROM review_events
     ) AS activity
     ORDER BY timestamp DESC
     LIMIT $2`,
    [instructorId, resolvedLimit]
  );

  return result.rows;
};
