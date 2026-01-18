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

