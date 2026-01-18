import { api } from './http';
import { Enrollment } from '../types';

export const getEnrollments = async (studentId?: number): Promise<Enrollment[]> => {
  const { data } = await api.get<{ enrollments: Enrollment[] }>('/enrollments', {
    params: studentId ? { studentId } : undefined
  });
  return data.enrollments;
};

export const enroll = async (payload: { course_id: number; student_id?: number }): Promise<Enrollment> => {
  const { data } = await api.post<{ enrollment: Enrollment }>('/enrollments', payload);
  return data.enrollment;
};

