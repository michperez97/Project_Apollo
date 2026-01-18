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

