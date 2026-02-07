import pool from '../config/database';

export interface InstructorEarnings {
  total_direct_sales: number;
  subscriber_enrollments: number;
  active_courses: number;
  avg_direct_sales_per_course: number;
  currency: string;
}

export interface CourseRevenue {
  course_id: number;
  title: string;
  price: number;
  direct_sales_count: number;
  direct_sales_revenue: number;
  subscriber_enrollments: number;
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

  const directSalesResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(e.tuition_amount), 0) AS total
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE c.instructor_id = $1
       AND e.payment_status = 'paid'`,
    [instructorId]
  );

  const subscriberUsageResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM (
       SELECT DISTINCT su.course_id, su.student_id
       FROM course_subscription_usage su
       JOIN courses c ON c.id = su.course_id
       WHERE c.instructor_id = $1

       UNION

       SELECT DISTINCT e.course_id, e.student_id
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = e.student_id
       WHERE c.instructor_id = $1
         AND u.subscription_status = 'active'
         AND (u.current_period_end IS NULL OR u.current_period_end > CURRENT_TIMESTAMP)
     ) subscriber_usage`,
    [instructorId]
  );

  const coursesResult = await pool.query<{ count: string }>(
    `SELECT COUNT(id) AS count
     FROM courses
     WHERE instructor_id = $1
       AND status = 'approved'`,
    [instructorId]
  );

  const totalDirectSales = Number(directSalesResult.rows[0]?.total ?? 0);
  const subscriberEnrollments = Number(subscriberUsageResult.rows[0]?.count ?? 0);
  const activeCourses = Number(coursesResult.rows[0]?.count ?? 0);
  const avgDirectSalesPerCourse = activeCourses > 0 ? totalDirectSales / activeCourses : 0;

  return {
    total_direct_sales: totalDirectSales,
    subscriber_enrollments: subscriberEnrollments,
    active_courses: activeCourses,
    avg_direct_sales_per_course: avgDirectSalesPerCourse,
    currency
  };
};

export const getInstructorCourseRevenue = async (instructorId: number): Promise<CourseRevenue[]> => {
  const result = await pool.query<{
    course_id: number;
    title: string;
    price: string;
    direct_sales_count: string;
    direct_sales_revenue: string;
    subscriber_enrollments: string;
  }>(
    `SELECT
       c.id AS course_id,
       c.title,
       COALESCE(c.price, 0) AS price,
       (
         SELECT COUNT(*)
         FROM enrollments e
         WHERE e.course_id = c.id
           AND e.payment_status = 'paid'
       ) AS direct_sales_count,
       (
         SELECT COALESCE(SUM(e.tuition_amount), 0)
         FROM enrollments e
         WHERE e.course_id = c.id
           AND e.payment_status = 'paid'
       ) AS direct_sales_revenue,
       (
         SELECT COUNT(*)
         FROM (
           SELECT DISTINCT su.student_id
           FROM course_subscription_usage su
           WHERE su.course_id = c.id

           UNION

           SELECT DISTINCT e.student_id
           FROM enrollments e
           JOIN users u ON u.id = e.student_id
           WHERE e.course_id = c.id
             AND u.subscription_status = 'active'
             AND (u.current_period_end IS NULL OR u.current_period_end > CURRENT_TIMESTAMP)
         ) subscriber_usage
       ) AS subscriber_enrollments
     FROM courses c
     WHERE c.instructor_id = $1
     ORDER BY direct_sales_revenue DESC, subscriber_enrollments DESC`,
    [instructorId]
  );

  return result.rows.map((row) => ({
    course_id: row.course_id,
    title: row.title,
    price: Number(row.price),
    direct_sales_count: Number(row.direct_sales_count),
    direct_sales_revenue: Number(row.direct_sales_revenue),
    subscriber_enrollments: Number(row.subscriber_enrollments)
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
       e.id AS transaction_id,
       c.title AS course_title,
       e.student_id,
       e.tuition_amount AS amount,
       e.payment_status AS status,
       e.enrolled_at AS created_at
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE c.instructor_id = $1
       AND e.payment_status = 'paid'
     ORDER BY e.enrolled_at DESC
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
