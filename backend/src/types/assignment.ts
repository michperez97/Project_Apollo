import { ModuleItemType } from './module';
import { UserRole } from './user';

export interface AssignmentRecord {
  id: number;
  course_id: number;
  module_id: number | null;
  title: string;
  description: string | null;
  due_at: Date | null;
  points: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SubmissionRecord {
  id: number;
  assignment_id: number;
  student_id: number;
  content_url: string | null;
  content_text: string | null;
  submitted_at: Date;
  grade: number | null;
  feedback: string | null;
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  due_at?: string | null;
  points?: number;
  module_id?: number | null;
}

export interface UpdateAssignmentInput extends Partial<CreateAssignmentInput> {}

export interface CreateSubmissionInput {
  content_url?: string | null;
  content_text?: string | null;
  student_id?: number;
}

export type SubmissionVisibility = 'all' | 'own';

export const isStaff = (role: UserRole) => role === 'admin' || role === 'teacher';


