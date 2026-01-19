import pool from '../config/database';
import { TransactionRecord } from '../models/transactionModel';

export interface StudentBalance {
  student_id: number;
  total_tuition: number;
  total_paid: number;
  total_refunded: number;
  balance: number;
  currency: string;
}

type TransactionRow = Omit<TransactionRecord, 'amount' | 'stripe_payment_id' | 'description'> & {
  amount: string;
  stripe_payment_id: string | null;
  description: string | null;
};

const mapTransaction = (row: TransactionRow): TransactionRecord => ({
  id: row.id,
  student_id: row.student_id,
  amount: Number(row.amount),
  type: row.type,
  stripe_payment_id: row.stripe_payment_id,
  status: row.status,
  description: row.description,
  created_at: row.created_at
});

export const getStudentBalance = async (studentId: number): Promise<StudentBalance> => {
  const currency = process.env.STRIPE_CURRENCY || 'usd';

  const tuitionResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(tuition_amount), 0) as total
     FROM enrollments
     WHERE student_id = $1`,
    [studentId]
  );
  const totalTuition = Number(tuitionResult.rows[0]?.total ?? 0);

  const paymentsResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE student_id = $1
       AND type = 'payment'
       AND status = 'completed'`,
    [studentId]
  );
  const totalPaid = Number(paymentsResult.rows[0]?.total ?? 0);

  const refundsResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE student_id = $1
       AND type = 'refund'
       AND status IN ('completed', 'refunded')`,
    [studentId]
  );
  const totalRefunded = Number(refundsResult.rows[0]?.total ?? 0);

  const balance = totalTuition - totalPaid + totalRefunded;

  return {
    student_id: studentId,
    total_tuition: totalTuition,
    total_paid: totalPaid,
    total_refunded: totalRefunded,
    balance,
    currency
  };
};

export const listTransactionsByStudent = async (studentId: number): Promise<TransactionRecord[]> => {
  const result = await pool.query<TransactionRow>(
    `SELECT * FROM transactions
     WHERE student_id = $1
     ORDER BY created_at DESC`,
    [studentId]
  );
  return result.rows.map(mapTransaction);
};

export const listAllTransactions = async (): Promise<TransactionRecord[]> => {
  const result = await pool.query<TransactionRow>(
    `SELECT * FROM transactions
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapTransaction);
};

export interface FinancialSummary {
  total_revenue: number;
  outstanding_balance: number;
  total_refunded: number;
  students_with_balance: number;
  students_paid: number;
  students_partial: number;
  students_pending: number;
  currency: string;
}

export const getFinancialSummary = async (): Promise<FinancialSummary> => {
  const currency = process.env.STRIPE_CURRENCY || 'usd';

  const revenueResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE type = 'payment'
       AND status = 'completed'`
  );
  const totalRevenue = Number(revenueResult.rows[0]?.total ?? 0);

  const tuitionResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(tuition_amount), 0) as total FROM enrollments`
  );
  const totalTuition = Number(tuitionResult.rows[0]?.total ?? 0);

  const refundedResult = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE type = 'refund'
       AND status IN ('completed', 'refunded')`
  );
  const totalRefunded = Number(refundedResult.rows[0]?.total ?? 0);

  const outstandingBalance = totalTuition - totalRevenue + totalRefunded;

  const statusCounts = await pool.query<{ payment_status: string; count: string }>(
    `SELECT payment_status, COUNT(DISTINCT student_id) as count
     FROM enrollments
     GROUP BY payment_status`
  );

  let studentsPaid = 0;
  let studentsPartial = 0;
  let studentsPending = 0;

  for (const row of statusCounts.rows) {
    const count = Number(row.count);
    if (row.payment_status === 'paid') studentsPaid = count;
    else if (row.payment_status === 'partial') studentsPartial = count;
    else if (row.payment_status === 'pending') studentsPending = count;
  }

  const studentsWithBalanceResult = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT student_id) as count
     FROM enrollments
     WHERE payment_status IN ('pending', 'partial')`
  );
  const studentsWithBalance = Number(studentsWithBalanceResult.rows[0]?.count ?? 0);

  return {
    total_revenue: totalRevenue,
    outstanding_balance: outstandingBalance,
    total_refunded: totalRefunded,
    students_with_balance: studentsWithBalance,
    students_paid: studentsPaid,
    students_partial: studentsPartial,
    students_pending: studentsPending,
    currency
  };
};

export interface StudentBalanceDetail extends StudentBalance {
  student_email: string;
  student_first_name: string;
  student_last_name: string;
  enrollment_count: number;
}

export const listAllStudentBalances = async (): Promise<StudentBalanceDetail[]> => {
  const currency = process.env.STRIPE_CURRENCY || 'usd';

  const result = await pool.query<{
    student_id: number;
    student_email: string;
    student_first_name: string;
    student_last_name: string;
    total_tuition: string;
    total_paid: string;
    total_refunded: string;
    enrollment_count: string;
  }>(
    `SELECT 
      u.id as student_id,
      u.email as student_email,
      u.first_name as student_first_name,
      u.last_name as student_last_name,
      COALESCE(SUM(e.tuition_amount), 0) as total_tuition,
      COALESCE(
        (SELECT SUM(amount) FROM transactions t 
         WHERE t.student_id = u.id 
           AND t.type = 'payment' 
           AND t.status = 'completed'), 
        0
      ) as total_paid,
      COALESCE(
        (SELECT SUM(amount) FROM transactions t 
         WHERE t.student_id = u.id 
           AND t.type = 'refund' 
           AND t.status IN ('completed', 'refunded')), 
        0
      ) as total_refunded,
      COUNT(e.id) as enrollment_count
     FROM users u
     LEFT JOIN enrollments e ON e.student_id = u.id
     WHERE u.role = 'student'
     GROUP BY u.id, u.email, u.first_name, u.last_name
     ORDER BY u.last_name, u.first_name`
  );

  return result.rows.map((row) => {
    const totalTuition = Number(row.total_tuition);
    const totalPaid = Number(row.total_paid);
    const totalRefunded = Number(row.total_refunded);
    const balance = totalTuition - totalPaid + totalRefunded;

    return {
      student_id: row.student_id,
      student_email: row.student_email,
      student_first_name: row.student_first_name,
      student_last_name: row.student_last_name,
      total_tuition: totalTuition,
      total_paid: totalPaid,
      total_refunded: totalRefunded,
      balance,
      enrollment_count: Number(row.enrollment_count),
      currency
    };
  });
};
