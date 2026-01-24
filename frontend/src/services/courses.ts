import { api } from './http';
import { Course } from '../types';

export const getCourses = async (): Promise<Course[]> => {
  const { data } = await api.get<{ courses: Course[] }>('/courses');
  return data.courses;
};

export const getCourse = async (id: number): Promise<Course> => {
  const { data } = await api.get<{ course: Course }>(`/courses/${id}`);
  return data.course;
};

export const createCourse = async (payload: Omit<Course, 'id'>): Promise<Course> => {
  const { data } = await api.post<{ course: Course }>('/courses', payload);
  return data.course;
};

export const updateCourse = async (id: number, payload: Partial<Omit<Course, 'id'>>): Promise<Course> => {
  const { data } = await api.put<{ course: Course }>(`/courses/${id}`, payload);
  return data.course;
};

export const deleteCourse = async (id: number): Promise<void> => {
  await api.delete(`/courses/${id}`);
};

export const getInstructorCourses = async (): Promise<Course[]> => {
  const { data } = await api.get<{ courses: Course[] }>('/instructor/courses');
  return data.courses;
};

export const submitCourse = async (courseId: number): Promise<Course> => {
  const { data } = await api.post<{ course: Course }>(`/courses/${courseId}/submit`);
  return data.course;
};

export const getPendingCourses = async (): Promise<Course[]> => {
  const { data } = await api.get<{ courses: Course[] }>('/admin/courses/pending');
  return data.courses;
};

export const approveCourse = async (courseId: number, feedback?: string): Promise<Course> => {
  const { data } = await api.post<{ course: Course }>(`/admin/courses/${courseId}/approve`, { feedback });
  return data.course;
};

export const rejectCourse = async (courseId: number, feedback: string): Promise<Course> => {
  const { data } = await api.post<{ course: Course }>(`/admin/courses/${courseId}/reject`, { feedback });
  return data.course;
};

