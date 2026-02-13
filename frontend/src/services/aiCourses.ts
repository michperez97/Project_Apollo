import { api } from './http';

export type AiCourseStatus = 'generating' | 'ready' | 'failed';

export interface AiCourseQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface AiCourseQuiz {
  questions: AiCourseQuizQuestion[];
}

export interface AiCourseLessonBase {
  id: string;
  title: string;
  type: 'text' | 'quiz';
}

export interface AiCourseTextLesson extends AiCourseLessonBase {
  type: 'text';
  content: string;
}

export interface AiCourseQuizLesson extends AiCourseLessonBase {
  type: 'quiz';
  quiz: AiCourseQuiz;
}

export type AiCourseLesson = AiCourseTextLesson | AiCourseQuizLesson;

export interface AiCourseSection {
  id: string;
  title: string;
  lessons: AiCourseLesson[];
}

export interface AiCourseContent {
  sections: AiCourseSection[];
}

export interface AiCourse {
  id: number;
  student_id: number;
  title: string;
  description: string | null;
  category: string | null;
  status: AiCourseStatus;
  content: Partial<AiCourseContent>;
  prompt: string;
  model_used: string | null;
  created_at: string;
  updated_at: string;
}

export const generateAiCourse = async (prompt: string): Promise<AiCourse> => {
  const { data } = await api.post<{ course: AiCourse }>('/ai-courses/generate', { prompt });
  return data.course;
};

export const getAiCourse = async (id: number): Promise<AiCourse> => {
  const { data } = await api.get<{ course: AiCourse }>(`/ai-courses/${id}`);
  return data.course;
};

export const listAiCourses = async (): Promise<AiCourse[]> => {
  const { data } = await api.get<{ courses: AiCourse[] }>('/ai-courses');
  return data.courses;
};

export const deleteAiCourse = async (id: number): Promise<void> => {
  await api.delete(`/ai-courses/${id}`);
};

export const pollAiCourseUntilReady = async (
  id: number,
  intervalMs = 3000,
  maxAttempts = 40
): Promise<AiCourse> => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    const course = await getAiCourse(id);
    if (course.status === 'ready' || course.status === 'failed') {
      return course;
    }

    attempt += 1;
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error('AI course generation timed out');
};
