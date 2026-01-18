import { api } from './http';
import { Assignment, Submission } from '../types';

export const getAssignments = async (courseId: number): Promise<Assignment[]> => {
  const { data } = await api.get<{ assignments: Assignment[] }>(`/courses/${courseId}/assignments`);
  return data.assignments;
};

export const createAssignment = async (
  courseId: number,
  payload: {
    title: string;
    description?: string;
    due_at?: string | null;
    points?: number;
    module_id?: number | null;
  }
): Promise<Assignment> => {
  const { data } = await api.post<{ assignment: Assignment }>(
    `/courses/${courseId}/assignments`,
    payload
  );
  return data.assignment;
};

export const updateAssignment = async (
  id: number,
  payload: Partial<Assignment>
): Promise<Assignment> => {
  const { data } = await api.put<{ assignment: Assignment }>(`/assignments/${id}`, payload);
  return data.assignment;
};

export const deleteAssignment = async (id: number): Promise<void> => {
  await api.delete(`/assignments/${id}`);
};

export const getSubmissions = async (assignmentId: number): Promise<Submission[]> => {
  const { data } = await api.get<{ submissions: Submission[] }>(
    `/assignments/${assignmentId}/submissions`
  );
  return data.submissions;
};

export const submitAssignment = async (
  assignmentId: number,
  payload: { content_url?: string; content_text?: string; student_id?: number }
): Promise<Submission> => {
  const { data } = await api.post<{ submission: Submission }>(
    `/assignments/${assignmentId}/submissions`,
    payload
  );
  return data.submission;
};

export const gradeSubmission = async (
  submissionId: number,
  payload: { grade: number | null; feedback?: string }
): Promise<Submission> => {
  const { data } = await api.post<{ submission: Submission }>(
    `/submissions/${submissionId}/grade`,
    payload
  );
  return data.submission;
};

