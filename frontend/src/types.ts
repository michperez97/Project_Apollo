export type UserRole = 'admin' | 'teacher' | 'student';

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
  code: string;
  name: string;
  description?: string | null;
  credit_hours: number;
  price_per_credit: number;
  teacher_id?: number | null;
  semester: string;
  year: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  tuition_amount: number;
  payment_status: 'pending' | 'paid' | 'partial';
  enrolled_at: string;
}

