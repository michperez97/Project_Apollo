import { api } from './http';

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

export interface CourseSection {
  id: number;
  course_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
  lessons: CourseLesson[];
}

export interface CourseContentResponse {
  course: {
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    price: number | null;
    thumbnail_url: string | null;
    status: string;
    instructor_id: number | null;
  };
  sections: CourseSection[];
  hasFullAccess: boolean;
}

export interface LessonProgress {
  id: number;
  student_id: number;
  lesson_id: number;
  status: 'in_progress' | 'completed';
  last_position_seconds: number;
  completed_at: string | null;
  updated_at: string;
}

export const getCourseContent = async (courseId: number): Promise<CourseContentResponse> => {
  const { data } = await api.get<CourseContentResponse>(`/courses/${courseId}/content`);
  return data;
};

export const getCourseProgress = async (courseId: number): Promise<LessonProgress[]> => {
  const { data } = await api.get<{ progress: LessonProgress[] }>(`/courses/${courseId}/progress`);
  return data.progress;
};

export const updateLessonProgress = async (
  lessonId: number,
  payload: { status?: 'in_progress' | 'completed'; last_position_seconds?: number }
): Promise<LessonProgress> => {
  const { data } = await api.post<{ progress: LessonProgress }>(`/lessons/${lessonId}/progress`, payload);
  return data.progress;
};
