import pool from '../config/database';
import crypto from 'crypto';

export interface Certificate {
  id: number;
  student_id: number;
  course_id: number;
  certificate_number: string;
  issued_at: Date;
  completed_at: Date;
}

export interface CertificateWithDetails extends Certificate {
  student_first_name: string;
  student_last_name: string;
  student_email: string;
  course_title: string;
  course_description: string | null;
}

// Generate unique certificate number
const generateCertificateNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `APOLLO-${timestamp}-${random}`;
};

// Create certificate
export const createCertificate = async (
  studentId: number,
  courseId: number,
  completedAt: Date
): Promise<Certificate> => {
  const certificateNumber = generateCertificateNumber();

  const result = await pool.query(
    `INSERT INTO certificates (student_id, course_id, certificate_number, issued_at, completed_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
     RETURNING *`,
    [studentId, courseId, certificateNumber, completedAt]
  );
  return result.rows[0];
};

// Get certificate by ID
export const getCertificateById = async (certificateId: number): Promise<CertificateWithDetails | null> => {
  const result = await pool.query(
    `SELECT
      c.*,
      u.first_name as student_first_name,
      u.last_name as student_last_name,
      u.email as student_email,
      co.title as course_title,
      co.description as course_description
     FROM certificates c
     JOIN users u ON c.student_id = u.id
     JOIN courses co ON c.course_id = co.id
     WHERE c.id = $1`,
    [certificateId]
  );
  return result.rows[0] || null;
};

// Get certificate by number (for verification)
export const getCertificateByNumber = async (certificateNumber: string): Promise<CertificateWithDetails | null> => {
  const result = await pool.query(
    `SELECT
      c.*,
      u.first_name as student_first_name,
      u.last_name as student_last_name,
      u.email as student_email,
      co.title as course_title,
      co.description as course_description
     FROM certificates c
     JOIN users u ON c.student_id = u.id
     JOIN courses co ON c.course_id = co.id
     WHERE c.certificate_number = $1`,
    [certificateNumber]
  );
  return result.rows[0] || null;
};

// Get all certificates for a student
export const getCertificatesByStudent = async (studentId: number): Promise<CertificateWithDetails[]> => {
  const result = await pool.query(
    `SELECT
      c.*,
      u.first_name as student_first_name,
      u.last_name as student_last_name,
      u.email as student_email,
      co.title as course_title,
      co.description as course_description
     FROM certificates c
     JOIN users u ON c.student_id = u.id
     JOIN courses co ON c.course_id = co.id
     WHERE c.student_id = $1
     ORDER BY c.issued_at DESC`,
    [studentId]
  );
  return result.rows;
};

// Get certificate for a specific student and course
export const getCertificateByStudentAndCourse = async (
  studentId: number,
  courseId: number
): Promise<Certificate | null> => {
  const result = await pool.query(
    'SELECT * FROM certificates WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId]
  );
  return result.rows[0] || null;
};

// Check if student already has certificate for course
export const hasCertificate = async (studentId: number, courseId: number): Promise<boolean> => {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM certificates WHERE student_id = $1 AND course_id = $2',
    [studentId, courseId]
  );
  return parseInt(result.rows[0].count) > 0;
};

// Delete certificate (admin only)
export const deleteCertificate = async (certificateId: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM certificates WHERE id = $1', [certificateId]);
  return result.rowCount ? result.rowCount > 0 : false;
};
