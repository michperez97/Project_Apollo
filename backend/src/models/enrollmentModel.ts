import pool from '../config/database';

export interface EnrollmentRecord {
  id: number;
  student_id: number;
  course_id: number;
  tuition_amount: number;
  payment_status: 'pending' | 'paid' | 'partial';
  enrolled_at: Date;
}

export type EnrollmentPaymentStatus = 'pending' | 'paid' | 'partial';

export interface EnrollmentInput {
  student_id: number;
  course_id: number;
  tuition_amount: number;
  payment_status?: 'pending' | 'paid' | 'partial';
}

export const createEnrollment = async (input: EnrollmentInput): Promise<EnrollmentRecord> => {
  const { student_id, course_id, tuition_amount, payment_status = 'pending' } = input;
  const result = await pool.query<EnrollmentRecord>(
    `INSERT INTO enrollments (student_id, course_id, tuition_amount, payment_status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [student_id, course_id, tuition_amount, payment_status]
  );
  return result.rows[0];
};

export const listEnrollments = async (): Promise<EnrollmentRecord[]> => {
  const result = await pool.query<EnrollmentRecord>(
    `SELECT * FROM enrollments ORDER BY enrolled_at DESC`
  );
  return result.rows;
};

export const listEnrollmentsByStudent = async (studentId: number): Promise<EnrollmentRecord[]> => {
  const result = await pool.query<EnrollmentRecord>(
    `SELECT * FROM enrollments WHERE student_id = $1 ORDER BY enrolled_at DESC`,
    [studentId]
  );
  return result.rows;
};

export const getEnrollmentById = async (id: number): Promise<EnrollmentRecord | null> => {
  const result = await pool.query<EnrollmentRecord>(
    `SELECT * FROM enrollments WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const updateEnrollmentPaymentStatus = async (
  id: number,
  payment_status: EnrollmentPaymentStatus
): Promise<EnrollmentRecord | null> => {
  const result = await pool.query<EnrollmentRecord>(
    `UPDATE enrollments
     SET payment_status = $1
     WHERE id = $2
     RETURNING *`,
    [payment_status, id]
  );

  return result.rows[0] ?? null;
};

export const getEnrollmentByStudentAndCourse = async (
  studentId: number,
  courseId: number
): Promise<EnrollmentRecord | null> => {
  const result = await pool.query<EnrollmentRecord>(
    `SELECT * FROM enrollments WHERE student_id = $1 AND course_id = $2 LIMIT 1`,
    [studentId, courseId]
  );
  return result.rows[0] ?? null;
};


