import { api } from './http';

export interface CourseSection {
  id: number;
  course_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLesson {
  id: number;
  course_id: number;
  section_id: number;
  title: string;
  lesson_type: 'video' | 'text' | 'quiz' | 'scorm';
  position: number;
  video_url: string | null;
  content: string | null;
  duration_seconds: number | null;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Sections ───────────────────────────────────────────────────────────────

export const listSections = async (courseId: number): Promise<CourseSection[]> => {
  const { data } = await api.get<{ sections: CourseSection[] }>(
    `/courses/${courseId}/sections`
  );
  return data.sections;
};

export const createSection = async (
  courseId: number,
  payload: { title: string; position?: number }
): Promise<CourseSection> => {
  const { data } = await api.post<{ section: CourseSection }>(
    `/courses/${courseId}/sections`,
    payload
  );
  return data.section;
};

export const updateSection = async (
  courseId: number,
  sectionId: number,
  payload: { title?: string; position?: number }
): Promise<CourseSection> => {
  const { data } = await api.put<{ section: CourseSection }>(
    `/courses/${courseId}/sections/${sectionId}`,
    payload
  );
  return data.section;
};

export const deleteSection = async (courseId: number, sectionId: number): Promise<void> => {
  await api.delete(`/courses/${courseId}/sections/${sectionId}`);
};

export const reorderSections = async (
  courseId: number,
  order: number[]
): Promise<CourseSection[]> => {
  const { data } = await api.put<{ sections: CourseSection[] }>(
    `/courses/${courseId}/sections/reorder`,
    { order }
  );
  return data.sections;
};

// ─── Lessons ────────────────────────────────────────────────────────────────

export const listLessons = async (
  courseId: number,
  sectionId: number
): Promise<CourseLesson[]> => {
  const { data } = await api.get<{ lessons: CourseLesson[] }>(
    `/courses/${courseId}/sections/${sectionId}/lessons`
  );
  return data.lessons;
};

export const createLesson = async (
  courseId: number,
  sectionId: number,
  payload: {
    title: string;
    lesson_type: 'video' | 'text' | 'quiz' | 'scorm';
    video_url?: string | null;
    content?: string | null;
    duration_seconds?: number | null;
    is_preview?: boolean;
    position?: number;
  }
): Promise<CourseLesson> => {
  const { data } = await api.post<{ lesson: CourseLesson }>(
    `/courses/${courseId}/sections/${sectionId}/lessons`,
    payload
  );
  return data.lesson;
};

export const updateLesson = async (
  courseId: number,
  sectionId: number,
  lessonId: number,
  payload: Partial<{
    title: string;
    lesson_type: 'video' | 'text' | 'quiz' | 'scorm';
    video_url: string | null;
    content: string | null;
    duration_seconds: number | null;
    is_preview: boolean;
    position: number;
  }>
): Promise<CourseLesson> => {
  const { data } = await api.put<{ lesson: CourseLesson }>(
    `/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`,
    payload
  );
  return data.lesson;
};

export const deleteLesson = async (
  courseId: number,
  sectionId: number,
  lessonId: number
): Promise<void> => {
  await api.delete(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`);
};

export const reorderLessons = async (
  courseId: number,
  sectionId: number,
  order: number[]
): Promise<CourseLesson[]> => {
  const { data } = await api.put<{ lessons: CourseLesson[] }>(
    `/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
    { order }
  );
  return data.lessons;
};
