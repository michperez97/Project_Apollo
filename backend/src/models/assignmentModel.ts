import pool from '../config/database';
import {
  AssignmentRecord,
  CreateAssignmentInput,
  CreateSubmissionInput,
  SubmissionRecord,
  UpdateAssignmentInput
} from '../types/assignment';

export const listAssignmentsByCourse = async (courseId: number): Promise<AssignmentRecord[]> => {
  const result = await pool.query<AssignmentRecord>(
    'SELECT * FROM assignments WHERE course_id = $1 ORDER BY due_at NULLS LAST, created_at DESC',
    [courseId]
  );
  return result.rows;
};

export const getAssignmentById = async (id: number): Promise<AssignmentRecord | null> => {
  const result = await pool.query<AssignmentRecord>('SELECT * FROM assignments WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const createAssignment = async (
  courseId: number,
  createdBy: number | null,
  input: CreateAssignmentInput
): Promise<AssignmentRecord> => {
  const { title, description = null, due_at = null, points = 100, module_id = null } = input;
  const result = await pool.query<AssignmentRecord>(
    `INSERT INTO assignments (course_id, module_id, title, description, due_at, points, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [courseId, module_id, title, description, due_at, points, createdBy]
  );
  return result.rows[0];
};

export const updateAssignment = async (
  id: number,
  data: UpdateAssignmentInput
): Promise<AssignmentRecord | null> => {
  const current = await getAssignmentById(id);
  if (!current) return null;

  const {
    title = current.title,
    description = current.description,
    due_at = current.due_at,
    points = current.points,
    module_id = current.module_id
  } = data;

  const result = await pool.query<AssignmentRecord>(
    `UPDATE assignments
     SET title = $1,
         description = $2,
         due_at = $3,
         points = $4,
         module_id = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [title, description, due_at, points, module_id, id]
  );
  return result.rows[0];
};

export const deleteAssignment = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
  return result.rowCount > 0;
};

export const listSubmissions = async (
  assignmentId: number,
  studentId?: number
): Promise<SubmissionRecord[]> => {
  if (studentId) {
    const result = await pool.query<SubmissionRecord>(
      'SELECT * FROM submissions WHERE assignment_id = $1 AND student_id = $2',
      [assignmentId, studentId]
    );
    return result.rows;
  }
  const result = await pool.query<SubmissionRecord>(
    'SELECT * FROM submissions WHERE assignment_id = $1 ORDER BY submitted_at DESC',
    [assignmentId]
  );
  return result.rows;
};

export const createSubmission = async (
  assignmentId: number,
  studentId: number,
  input: CreateSubmissionInput
): Promise<SubmissionRecord> => {
  const { content_url = null, content_text = null } = input;
  const result = await pool.query<SubmissionRecord>(
    `INSERT INTO submissions (assignment_id, student_id, content_url, content_text)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (assignment_id, student_id)
     DO UPDATE SET content_url = EXCLUDED.content_url,
                   content_text = EXCLUDED.content_text,
                   submitted_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [assignmentId, studentId, content_url, content_text]
  );
  return result.rows[0];
};

export const gradeSubmission = async (
  submissionId: number,
  grade: number | null,
  feedback?: string | null
): Promise<SubmissionRecord | null> => {
  const result = await pool.query<SubmissionRecord>(
    `UPDATE submissions
     SET grade = $1,
         feedback = $2
     WHERE id = $3
     RETURNING *`,
    [grade, feedback ?? null, submissionId]
  );
  return result.rows[0] ?? null;
};

export const listSubmissionsByCourse = async (
  courseId: number,
  studentId?: number
): Promise<SubmissionRecord[]> => {
  if (studentId) {
    const result = await pool.query<SubmissionRecord>(
      `SELECT s.*
       FROM submissions s
       INNER JOIN assignments a ON a.id = s.assignment_id
       WHERE a.course_id = $1 AND s.student_id = $2`,
      [courseId, studentId]
    );
    return result.rows;
  }

  const result = await pool.query<SubmissionRecord>(
    `SELECT s.*
     FROM submissions s
     INNER JOIN assignments a ON a.id = s.assignment_id
     WHERE a.course_id = $1`,
    [courseId]
  );
  return result.rows;
};

export const listGradeAverages = async (
  courseId: number
): Promise<{ student_id: number; avg_grade: number | null; submission_count: number }[]> => {
  const result = await pool.query<{
    student_id: number;
    avg_grade: number | null;
    submission_count: number;
  }>(
    `SELECT s.student_id, AVG(s.grade) as avg_grade, COUNT(*) as submission_count
     FROM submissions s
     INNER JOIN assignments a ON a.id = s.assignment_id
     WHERE a.course_id = $1
     GROUP BY s.student_id`,
    [courseId]
  );
  return result.rows;
};

