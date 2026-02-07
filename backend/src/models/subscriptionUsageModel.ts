import pool from '../config/database';

export const recordSubscriptionUsage = async (studentId: number, courseId: number): Promise<void> => {
  await pool.query(
    `INSERT INTO course_subscription_usage (student_id, course_id)
     VALUES ($1, $2)
     ON CONFLICT (student_id, course_id)
     DO UPDATE SET last_accessed_at = CURRENT_TIMESTAMP`,
    [studentId, courseId]
  );
};

