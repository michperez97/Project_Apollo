import pool from '../config/database';

export interface InstructorEarnings {
  total_revenue: number;
  total_enrollments: number;
  active_courses: number;
  avg_per_course: number;
  currency: string;
}

export interface CourseRevenue {
  course_id: number;
  title: string;
  price: number;
  enrollment_count: number;
  paid_count: number;
  revenue: number;
}

export interface InstructorTransaction {
  transaction_id: number;
  course_title: string;
  student_id: number;
  amount: number;
  status: string;
  created_at: Date;
}

export const getInstructorEarnings = async (instructorId: number): Promise<InstructorEarnings> => {
  const currency = process.env.STRIPE_CURRENCY || 'usd';

  const revenueResult = await pool.query<{ total: string; enrollment_count: string }>(
    `SELECT
       COALESCE(SUM(e.tuition_amount), 0) AS total,
       COUNT(e.id) AS enrollment_count
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE c.instructor_id = $1
       AND e.payment_status = 'paid'`,
    [instructorId]
  );

  const totalRevenue = Number(revenueResult.rows[0]?.total ?? 0);
  const totalEnrollments = Number(revenueResult.rows[0]?.enrollment_count ?? 0);

  const coursesResult = await pool.query<{ count: string }>(
    `SELECT COUNT(id) AS count
     FROM courses
     WHERE instructor_id = $1
       AND status = 'approved'`,
    [instructorId]
  );
  const activeCourses = Number(coursesResult.rows[0]?.count ?? 0);

  const avgPerCourse = activeCourses > 0 ? totalRevenue / activeCourses : 0;

  return {
    total_revenue: totalRevenue,
    total_enrollments: totalEnrollments,
    active_courses: activeCourses,
    avg_per_course: avgPerCourse,
    currency
  };
};

export const getInstructorCourseRevenue = async (instructorId: number): Promise<CourseRevenue[]> => {
  const result = await pool.query<{
    course_id: number;
    title: string;
    price: string;
    enrollment_count: string;
    paid_count: string;
    revenue: string;
  }>(
    `SELECT
       c.id AS course_id,
       c.title,
       COALESCE(c.price, 0) AS price,
       COUNT(e.id) AS enrollment_count,
       COUNT(e.id) FILTER (WHERE e.payment_status = 'paid') AS paid_count,
       COALESCE(SUM(e.tuition_amount) FILTER (WHERE e.payment_status = 'paid'), 0) AS revenue
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     WHERE c.instructor_id = $1
     GROUP BY c.id, c.title, c.price
     ORDER BY revenue DESC`,
    [instructorId]
  );

  return result.rows.map((row) => ({
    course_id: row.course_id,
    title: row.title,
    price: Number(row.price),
    enrollment_count: Number(row.enrollment_count),
    paid_count: Number(row.paid_count),
    revenue: Number(row.revenue)
  }));
};

export const getInstructorTransactions = async (instructorId: number): Promise<InstructorTransaction[]> => {
  const result = await pool.query<{
    transaction_id: number;
    course_title: string;
    student_id: number;
    amount: string;
    status: string;
    created_at: Date;
  }>(
    `SELECT
       t.id AS transaction_id,
       c.title AS course_title,
       t.student_id,
       t.amount,
       t.status,
       t.created_at
     FROM transactions t
     JOIN enrollments e ON e.student_id = t.student_id
     JOIN courses c ON c.id = e.course_id
     WHERE c.instructor_id = $1
       AND t.type = 'payment'
       AND t.status = 'completed'
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [instructorId]
  );

  return result.rows.map((row) => ({
    transaction_id: row.transaction_id,
    course_title: row.course_title,
    student_id: row.student_id,
    amount: Number(row.amount),
    status: row.status,
    created_at: row.created_at
  }));
};
