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
  credit_hours: number;
  price_per_credit: string | number;
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
  const result = await pool.query<CourseRow>(
    `INSERT INTO courses (code, name, description, credit_hours, price_per_credit, teacher_id, semester, year, title, category, price, status, instructor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (code)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       credit_hours = EXCLUDED.credit_hours,
       price_per_credit = EXCLUDED.price_per_credit,
       teacher_id = EXCLUDED.teacher_id,
       semester = EXCLUDED.semester,
       year = EXCLUDED.year,
       title = EXCLUDED.title,
       category = EXCLUDED.category,
       price = EXCLUDED.price,
       status = EXCLUDED.status,
       instructor_id = EXCLUDED.instructor_id,
       updated_at = CURRENT_TIMESTAMP
     RETURNING id, credit_hours, price_per_credit`,
    [
      'DATA-STRUCT-101',
      'Data Structures',
      'Core data structures and how to apply them in real-world problem solving.',
      3,
      120,
      instructorId,
      'On Demand',
      new Date().getFullYear(),
      'Data Structures',
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

const main = async () => {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const admin = await upsertUser('admin', ADMIN_EMAIL, passwordHash);
  const instructor = await upsertUser('instructor', INSTRUCTOR_EMAIL, passwordHash);
  const student = await upsertUser('student', STUDENT_EMAIL, passwordHash);

  const course = await upsertCourse(instructor.id);
  const tuitionAmount = Number(course.credit_hours) * Number(course.price_per_credit);
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
