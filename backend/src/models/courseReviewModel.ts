import pool from '../config/database';

export type ReviewAction = 'approved' | 'rejected';

export interface CourseReviewRecord {
  id: number;
  course_id: number;
  admin_id: number;
  action: ReviewAction;
  feedback: string | null;
  created_at: Date;
}

export interface CourseReviewInput {
  course_id: number;
  admin_id: number;
  action: ReviewAction;
  feedback?: string | null;
}

export const createCourseReview = async (input: CourseReviewInput): Promise<CourseReviewRecord> => {
  const result = await pool.query<CourseReviewRecord>(
    `INSERT INTO course_reviews (course_id, admin_id, action, feedback)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.course_id, input.admin_id, input.action, input.feedback ?? null]
  );
  return result.rows[0];
};

export const getReviewsByCourse = async (courseId: number): Promise<CourseReviewRecord[]> => {
  const result = await pool.query<CourseReviewRecord>(
    'SELECT * FROM course_reviews WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );
  return result.rows;
};
