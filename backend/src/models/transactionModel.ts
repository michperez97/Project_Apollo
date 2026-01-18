import pool from '../config/database';

export type TransactionType = 'payment' | 'refund' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface TransactionRecord {
  id: number;
  student_id: number;
  amount: number;
  type: TransactionType;
  stripe_payment_id: string | null;
  status: TransactionStatus;
  description: string | null;
  created_at: Date;
}

export interface TransactionInput {
  student_id: number;
  amount: number;
  type: TransactionType;
  stripe_payment_id?: string | null;
  status?: TransactionStatus;
  description?: string | null;
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

export const createTransaction = async (input: TransactionInput): Promise<TransactionRecord> => {
  const {
    student_id,
    amount,
    type,
    stripe_payment_id = null,
    status = 'pending',
    description = null
  } = input;

  const result = await pool.query<TransactionRow>(
    `INSERT INTO transactions (student_id, amount, type, stripe_payment_id, status, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [student_id, amount, type, stripe_payment_id, status, description]
  );

  return mapTransaction(result.rows[0]);
};

export const findTransactionByStripePaymentId = async (
  stripePaymentId: string
): Promise<TransactionRecord | null> => {
  const result = await pool.query<TransactionRow>(
    `SELECT * FROM transactions WHERE stripe_payment_id = $1 LIMIT 1`,
    [stripePaymentId]
  );
  return result.rows[0] ? mapTransaction(result.rows[0]) : null;
};

export const updateTransactionStatusByStripeId = async (
  stripePaymentId: string,
  status: TransactionStatus,
  description?: string
): Promise<TransactionRecord | null> => {
  const result = await pool.query<TransactionRow>(
    `UPDATE transactions
     SET status = $1,
         description = COALESCE($2, description),
         created_at = created_at
     WHERE stripe_payment_id = $3
     RETURNING *`,
    [status, description ?? null, stripePaymentId]
  );

  return result.rows[0] ? mapTransaction(result.rows[0]) : null;
};
