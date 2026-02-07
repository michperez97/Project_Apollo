import { api } from './http';
import { Course } from '../types';

export interface ScormImportResponse {
  course: Course;
  section: {
    id: number;
    course_id: number;
    title: string;
    position: number;
  };
  lesson: {
    id: number;
    course_id: number;
    section_id: number;
    title: string;
    lesson_type: 'scorm';
    position: number;
  };
  scormPackage: {
    id: number;
    title: string;
    version: string;
    launch_path: string;
  };
}

export const importScormPackage = async (payload: {
  packageUrl: string;
  fileName: string;
  title?: string;
  description?: string;
  price?: number;
}): Promise<ScormImportResponse> => {
  const { data } = await api.post<ScormImportResponse>('/scorm/import', payload);
  return data;
};

export interface ScormAttemptResponse {
  attemptId: number;
  launchUrl: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
}

export const startScormAttempt = async (lessonId: number): Promise<ScormAttemptResponse> => {
  const { data } = await api.post<ScormAttemptResponse>(`/scorm/lessons/${lessonId}/attempt`);
  return data;
};
