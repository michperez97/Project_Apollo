import { api } from './http';

export interface Quiz {
  id: number;
  course_id: number;
  lesson_id: number | null;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  position: number;
  points: number;
  created_at: string;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  id: number;
  question_id: number;
  answer_text: string;
  is_correct?: boolean;
  position: number;
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  student_id: number;
  score: number | null;
  passed: boolean | null;
  started_at: string;
  completed_at: string | null;
}

export interface QuizWithQuestions {
  quiz: Quiz;
  questions: QuizQuestion[];
}

export interface SubmitQuizResponse {
  attempt: QuizAttempt;
  score: number;
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
}

// Get all quizzes for a course
export const getQuizzesByCourse = async (courseId: number): Promise<Quiz[]> => {
  const { data } = await api.get<{ quizzes: Quiz[] }>(`/quizzes/courses/${courseId}/quizzes`);
  return data.quizzes;
};

// Get quiz with questions
export const getQuiz = async (quizId: number): Promise<QuizWithQuestions> => {
  const { data } = await api.get<QuizWithQuestions>(`/quizzes/${quizId}`);
  return data;
};

// Create quiz (instructor/admin)
export const createQuiz = async (quizData: Partial<Quiz>): Promise<Quiz> => {
  const { data } = await api.post<{ quiz: Quiz }>('/quizzes', quizData);
  return data.quiz;
};

// Update quiz (instructor/admin)
export const updateQuiz = async (quizId: number, quizData: Partial<Quiz>): Promise<Quiz> => {
  const { data } = await api.put<{ quiz: Quiz }>(`/quizzes/${quizId}`, quizData);
  return data.quiz;
};

// Delete quiz (instructor/admin)
export const deleteQuiz = async (quizId: number): Promise<void> => {
  await api.delete(`/quizzes/${quizId}`);
};

// Add question to quiz (instructor/admin)
export const addQuestion = async (
  quizId: number,
  questionData: {
    question_text: string;
    question_type: 'multiple_choice' | 'true_false';
    position: number;
    points?: number;
    answers: Array<{ answer_text: string; is_correct: boolean; position: number }>;
  }
): Promise<QuizQuestion> => {
  const { data } = await api.post<{ question: QuizQuestion }>(`/quizzes/${quizId}/questions`, questionData);
  return data.question;
};

// Delete question (instructor/admin)
export const deleteQuestion = async (quizId: number, questionId: number): Promise<void> => {
  await api.delete(`/quizzes/${quizId}/questions/${questionId}`);
};

// Start quiz attempt (student)
export const startQuizAttempt = async (quizId: number): Promise<QuizAttempt> => {
  const { data } = await api.post<{ attempt: QuizAttempt }>(`/quizzes/${quizId}/attempt`);
  return data.attempt;
};

// Submit quiz attempt (student)
export const submitQuizAttempt = async (
  attemptId: number,
  responses: Array<{ question_id: number; selected_answer_id: number | null }>
): Promise<SubmitQuizResponse> => {
  const { data } = await api.post<SubmitQuizResponse>(`/quizzes/attempts/${attemptId}/submit`, { responses });
  return data;
};

// Get student's attempts for a quiz
export const getQuizAttempts = async (quizId: number): Promise<QuizAttempt[]> => {
  const { data } = await api.get<{ attempts: QuizAttempt[] }>(`/quizzes/${quizId}/attempts`);
  return data.attempts;
};
