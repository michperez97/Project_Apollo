import bcrypt from 'bcrypt';
import pool from '../config/database';

type UserRole = 'admin' | 'instructor' | 'student';

type UserRow = {
  id: number;
  email: string;
  role: UserRole;
};

type CourseRow = {
  id: number;
  price: number;
};

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@apollo.local';
const INSTRUCTOR_EMAIL = process.env.SEED_INSTRUCTOR_EMAIL ?? 'instructor@apollo.local';
const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? 'student@apollo.local';

const upsertUser = async (role: UserRole, email: string, passwordHash: string): Promise<UserRow> => {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role = EXCLUDED.role,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, email, role`,
    [
      email,
      passwordHash,
      role === 'admin' ? 'Admin' : role === 'instructor' ? 'Instructor' : 'Student',
      'User',
      role
    ]
  );

  return result.rows[0];
};

const upsertCourse = async (instructorId: number): Promise<CourseRow> => {
  const title = 'Data Structures & Algorithms';

  // Delete existing course by title, then re-insert
  await pool.query('DELETE FROM courses WHERE title = $1', [title]);

  const result = await pool.query<CourseRow>(
    `INSERT INTO courses (title, description, category, price, status, instructor_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, price`,
    [
      title,
      'Core data structures (arrays, linked lists, stacks, queues, trees, graphs) and algorithm analysis (Big-O, sorting, searching).',
      'Computer Science',
      149,
      'approved',
      instructorId
    ]
  );

  return result.rows[0];
};

const getOrCreateModule = async (courseId: number, title: string, position: number) => {
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM modules WHERE course_id = $1 AND title = $2 ORDER BY id LIMIT 1',
    [courseId, title]
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const result = await pool.query<{ id: number }>(
    `INSERT INTO modules (course_id, title, position)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [courseId, title, position]
  );
  return result.rows[0].id;
};

const getOrCreateModuleItem = async (
  moduleId: number,
  payload: { title: string; type: 'text' | 'link' | 'file'; contentUrl?: string; contentText?: string },
  position: number
) => {
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM module_items WHERE module_id = $1 AND title = $2 ORDER BY id LIMIT 1',
    [moduleId, payload.title]
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const result = await pool.query<{ id: number }>(
    `INSERT INTO module_items (module_id, title, type, content_url, content_text, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [moduleId, payload.title, payload.type, payload.contentUrl ?? null, payload.contentText ?? null, position]
  );
  return result.rows[0].id;
};

const getOrCreateAssignment = async (
  courseId: number,
  moduleId: number | null,
  createdBy: number,
  payload: { title: string; description?: string; points?: number }
) => {
  const existing = await pool.query<{ id: number }>(
    'SELECT id FROM assignments WHERE course_id = $1 AND title = $2 ORDER BY id LIMIT 1',
    [courseId, payload.title]
  );
  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const result = await pool.query<{ id: number }>(
    `INSERT INTO assignments (course_id, module_id, title, description, points, due_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      courseId,
      moduleId,
      payload.title,
      payload.description ?? null,
      payload.points ?? 100,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy
    ]
  );
  return result.rows[0].id;
};

const upsertEnrollment = async (studentId: number, courseId: number, tuitionAmount: number) => {
  await pool.query(
    `INSERT INTO enrollments (student_id, course_id, tuition_amount, payment_status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id, course_id)
     DO UPDATE SET tuition_amount = EXCLUDED.tuition_amount`,
    [studentId, courseId, tuitionAmount, 'pending']
  );
};

const upsertSubmission = async (
  assignmentId: number,
  studentId: number,
  payload: { contentText: string; grade: number; feedback: string }
) => {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO submissions (assignment_id, student_id, content_text, submitted_at, grade, feedback)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET
       content_text = EXCLUDED.content_text,
       grade = EXCLUDED.grade,
       feedback = EXCLUDED.feedback,
       submitted_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [assignmentId, studentId, payload.contentText, payload.grade, payload.feedback]
  );

  return result.rows[0].id;
};

const tableExists = async (tableName: string): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
};

const main = async () => {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await upsertUser('admin', ADMIN_EMAIL, passwordHash);
  const instructor = await upsertUser('instructor', INSTRUCTOR_EMAIL, passwordHash);
  const student = await upsertUser('student', STUDENT_EMAIL, passwordHash);

  const course = await upsertCourse(instructor.id);
  const tuitionAmount = Number(course.price);
  await upsertEnrollment(student.id, course.id, tuitionAmount);

  const moduleId = await getOrCreateModule(course.id, 'Getting Started', 1);
  await getOrCreateModuleItem(
    moduleId,
    { title: 'Syllabus', type: 'link', contentUrl: 'https://example.com/syllabus' },
    1
  );
  await getOrCreateModuleItem(
    moduleId,
    { title: 'Welcome', type: 'text', contentText: 'Welcome to Project Apollo.' },
    2
  );

  const assignmentId = await getOrCreateAssignment(course.id, moduleId, instructor.id, {
    title: 'Homework 1',
    description: 'Complete the onboarding checklist.',
    points: 100
  });

  await upsertSubmission(assignmentId, student.id, {
    contentText: 'Completed the checklist.',
    grade: 95,
    feedback: 'Great start!'
  });

  if (await tableExists('conversations')) {
    // Seed a sample inbox thread (idempotent).
    const existing = await pool.query<{ id: number }>(
      `
      SELECT c.id
      FROM conversations c
      WHERE c.course_id = $1
        AND EXISTS (
          SELECT 1 FROM conversation_participants p
          WHERE p.conversation_id = c.id AND p.user_id = $2
        )
        AND EXISTS (
          SELECT 1 FROM conversation_participants p
          WHERE p.conversation_id = c.id AND p.user_id = $3
        )
        AND (
          SELECT COUNT(*) FROM conversation_participants p
          WHERE p.conversation_id = c.id
        ) = 2
      LIMIT 1
      `,
      [course.id, instructor.id, student.id]
    );

    if (existing.rows[0]) {
      await pool.query('DELETE FROM conversations WHERE id = $1', [existing.rows[0].id]);
    }

    const created = await pool.query<{ id: number }>(
      `INSERT INTO conversations (course_id, subject) VALUES ($1, $2) RETURNING id`,
      [course.id, 'Welcome to Apollo']
    );
    const conversationId = created.rows[0].id;

    await pool.query(
      `
      INSERT INTO conversation_participants (conversation_id, user_id, last_read_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP), ($1, $3, CURRENT_TIMESTAMP)
      `,
      [conversationId, instructor.id, student.id]
    );

    await pool.query(
      `
      INSERT INTO conversation_messages (conversation_id, sender_id, body)
      VALUES
        ($1, $2, $3),
        ($1, $4, $5)
      `,
      [
        conversationId,
        instructor.id,
        "Welcome. If you get stuck, message me here and I'll help you unblock quickly.",
        student.id,
        'Thanks! Excited to start the course.'
      ]
    );
  }

  console.log('Seed complete');
  console.log(`Admin: ${admin.email}`);
  console.log(`Instructor: ${instructor.email}`);
  console.log(`Student: ${student.email}`);
  console.log(`Course ID: ${course.id}`);
};

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
