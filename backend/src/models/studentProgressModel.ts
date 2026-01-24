import pool from '../config/database';

export type ProgressStatus = 'in_progress' | 'completed';

export interface StudentProgressRecord {
  id: number;
  student_id: number;
  lesson_id: number;
  status: ProgressStatus;
  last_position_seconds: number;
  completed_at: Date | null;
  updated_at: Date;
}

export interface StudentProgressInput {
  student_id: number;
  lesson_id: number;
  status?: ProgressStatus;
  last_position_seconds?: number;
  completed_at?: Date | null;
}

export const getProgressByStudentAndLesson = async (
  studentId: number,
  lessonId: number
): Promise<StudentProgressRecord | null> => {
  const result = await pool.query<StudentProgressRecord>(
    'SELECT * FROM student_progress WHERE student_id = $1 AND lesson_id = $2',
    [studentId, lessonId]
  );
  return result.rows[0] ?? null;
};

export const listProgressByStudent = async (studentId: number): Promise<StudentProgressRecord[]> => {
  const result = await pool.query<StudentProgressRecord>(
    'SELECT * FROM student_progress WHERE student_id = $1',
    [studentId]
  );
  return result.rows;
};

export const listProgressByStudentAndCourse = async (
  studentId: number,
  courseId: number
): Promise<StudentProgressRecord[]> => {
  const result = await pool.query<StudentProgressRecord>(
    `SELECT sp.* FROM student_progress sp
     JOIN course_lessons cl ON sp.lesson_id = cl.id
     WHERE sp.student_id = $1 AND cl.course_id = $2`,
    [studentId, courseId]
  );
  return result.rows;
};

export const upsertProgress = async (input: StudentProgressInput): Promise<StudentProgressRecord> => {
  const { student_id, lesson_id, status, last_position_seconds, completed_at } = input;

  const result = await pool.query<StudentProgressRecord>(
    `INSERT INTO student_progress (student_id, lesson_id, status, last_position_seconds, completed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (student_id, lesson_id)
     DO UPDATE SET
       status = COALESCE($3, student_progress.status),
       last_position_seconds = COALESCE($4, student_progress.last_position_seconds),
       completed_at = CASE WHEN $3 = 'completed' THEN COALESCE($5, CURRENT_TIMESTAMP) ELSE student_progress.completed_at END,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      student_id,
      lesson_id,
      status ?? 'in_progress',
      last_position_seconds ?? 0,
      completed_at ?? null
    ]
  );
  return result.rows[0];
};

export const countCompletedLessonsByStudentAndCourse = async (
  studentId: number,
  courseId: number
): Promise<number> => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM student_progress sp
     JOIN course_lessons cl ON sp.lesson_id = cl.id
     WHERE sp.student_id = $1 AND cl.course_id = $2 AND sp.status = 'completed'`,
    [studentId, courseId]
  );
  return parseInt(result.rows[0].count, 10);
};
