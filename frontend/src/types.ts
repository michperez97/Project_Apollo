export type UserRole = 'admin' | 'instructor' | 'student';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Course {
  id: number;
  title?: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  thumbnail_url?: string | null;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  instructor_id?: number | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  code?: string;
  name?: string;
  credit_hours?: number;
  price_per_credit?: number;
  teacher_id?: number | null;
  semester?: string;
  year?: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  tuition_amount: number;
  payment_status: 'pending' | 'paid' | 'partial';
  enrolled_at: string;
}

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TransactionType = 'payment' | 'refund' | 'adjustment';

export interface Transaction {
  id: number;
  student_id: number;
  amount: number;
  type: TransactionType;
  stripe_payment_id: string | null;
  status: TransactionStatus;
  description: string | null;
  created_at: string;
}

export interface PaymentIntentSession {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
  transaction: Transaction;
}

export type ModuleItemType = 'text' | 'link' | 'file';

export interface ModuleItem {
  id: number;
  module_id: number;
  title: string;
  type: ModuleItemType;
  content_url?: string | null;
  content_text?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: number;
  course_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
  items: ModuleItem[];
}

export interface Assignment {
  id: number;
  course_id: number;
  module_id?: number | null;
  title: string;
  description?: string | null;
  due_at?: string | null;
  points: number;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  content_url?: string | null;
  content_text?: string | null;
  submitted_at: string;
  grade?: number | null;
  feedback?: string | null;
}

export interface StudentBalance {
  student_id: number;
  total_tuition: number;
  total_paid: number;
  total_refunded: number;
  balance: number;
  currency: string;
}

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

export interface StudentBalanceDetail extends StudentBalance {
  student_email: string;
  student_first_name: string;
  student_last_name: string;
  enrollment_count: number;
}

export interface Announcement {
  id: number;
  course_id: number;
  teacher_id: number;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
}
