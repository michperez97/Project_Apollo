import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import * as quizModel from '../models/quizModel';

// Get all quizzes for a course
export const getQuizzesByCourse = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'Invalid course ID' });
    }

    const quizzes = await quizModel.getQuizzesByCourse(courseId);
    return res.json({ quizzes });
  } catch (error) {
    return next(error);
  }
};

// Get quiz by ID with questions and answers
export const getQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const quiz = await quizModel.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const questions = await quizModel.getQuestionsByQuiz(quizId);

    // Get answers for each question
    const questionsWithAnswers = await Promise.all(
      questions.map(async (question) => {
        const answers = await quizModel.getAnswersByQuestion(question.id);

        // Hide correct answers for students taking the quiz
        if (req.user?.role === 'student') {
          return {
            ...question,
            answers: answers.map(({ id, answer_text, position }) => ({
              id,
              answer_text,
              position
            }))
          };
        }

        return { ...question, answers };
      })
    );

    return res.json({ quiz, questions: questionsWithAnswers });
  } catch (error) {
    return next(error);
  }
};

// Create quiz (instructor/admin only)
export const createQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { course_id, lesson_id, title, description, passing_score, time_limit_minutes } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({ error: 'Course ID and title are required' });
    }

    const quiz = await quizModel.createQuiz({
      course_id,
      lesson_id,
      title,
      description,
      passing_score,
      time_limit_minutes
    });

    return res.status(201).json({ quiz });
  } catch (error) {
    return next(error);
  }
};

// Update quiz (instructor/admin only)
export const updateQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const { title, description, passing_score, time_limit_minutes } = req.body;

    const quiz = await quizModel.updateQuiz(quizId, {
      title,
      description,
      passing_score,
      time_limit_minutes
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    return res.json({ quiz });
  } catch (error) {
    return next(error);
  }
};

// Delete quiz (instructor/admin only)
export const deleteQuiz = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const deleted = await quizModel.deleteQuiz(quizId);
    if (!deleted) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    return res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

// Add question to quiz (instructor/admin only)
export const addQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    const { question_text, question_type, position, points, answers } = req.body;

    if (!question_text || !question_type || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        error: 'Question text, type, and answers array are required'
      });
    }

    // Validate at least one correct answer
    const hasCorrectAnswer = answers.some(a => a.is_correct);
    if (!hasCorrectAnswer) {
      return res.status(400).json({ error: 'At least one answer must be marked as correct' });
    }

    const question = await quizModel.createQuestion({
      quiz_id: quizId,
      question_text,
      question_type,
      position: position || 1,
      points,
      answers
    });

    return res.status(201).json({ question });
  } catch (error) {
    return next(error);
  }
};

// Delete question (instructor/admin only)
export const deleteQuestion = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const questionId = Number(req.params.questionId);
    if (!Number.isFinite(questionId)) {
      return res.status(400).json({ error: 'Invalid question ID' });
    }

    const deleted = await quizModel.deleteQuestion(questionId);
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }

    return res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    return next(error);
  }
};

// Start quiz attempt (student only)
export const startAttempt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const quiz = await quizModel.getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const attempt = await quizModel.createAttempt(quizId, req.user.sub);
    return res.status(201).json({ attempt });
  } catch (error) {
    return next(error);
  }
};

// Submit quiz attempt (student only)
export const submitAttempt = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const attemptId = Number(req.params.attemptId);
    if (!Number.isFinite(attemptId)) {
      return res.status(400).json({ error: 'Invalid attempt ID' });
    }

    const { responses } = req.body;
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses array is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const attempt = await quizModel.getAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.student_id !== req.user.sub) {
      return res.status(403).json({ error: 'Not authorized to submit this attempt' });
    }

    if (attempt.completed_at) {
      return res.status(400).json({ error: 'Attempt already submitted' });
    }

    const quiz = await quizModel.getQuizById(attempt.quiz_id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Save responses and calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const response of responses) {
      const question = await quizModel.getQuestionsByQuiz(quiz.id);
      const q = question.find(qu => qu.id === response.question_id);
      if (!q) continue;

      totalPoints += q.points;

      // Check if answer is correct
      const answers = await quizModel.getAnswersByQuestion(response.question_id);
      const selectedAnswer = answers.find(a => a.id === response.selected_answer_id);
      const isCorrect = selectedAnswer?.is_correct || false;

      if (isCorrect) {
        earnedPoints += q.points;
      }

      await quizModel.saveResponse(
        attemptId,
        response.question_id,
        response.selected_answer_id,
        isCorrect
      );
    }

    // Calculate percentage score
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passing_score;

    const submittedAttempt = await quizModel.submitAttempt(attemptId, score, passed);

    return res.json({
      attempt: submittedAttempt,
      score,
      passed,
      earnedPoints,
      totalPoints
    });
  } catch (error) {
    return next(error);
  }
};

// Get student's attempts for a quiz
export const getAttempts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const quizId = Number(req.params.id);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const attempts = await quizModel.getAttemptsByStudent(req.user.sub, quizId);
    return res.json({ attempts });
  } catch (error) {
    return next(error);
  }
};
