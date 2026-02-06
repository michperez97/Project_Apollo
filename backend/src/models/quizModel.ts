import pool from '../config/database';

export interface Quiz {
  id: number;
  course_id: number;
  lesson_id: number | null;
  title: string;
  description: string | null;
  passing_score: number;
  time_limit_minutes: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuizQuestion {
  id: number;
  quiz_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  position: number;
  points: number;
  created_at: Date;
}

export interface QuizAnswer {
  id: number;
  question_id: number;
  answer_text: string;
  is_correct: boolean;
  position: number;
}

export interface QuizAttempt {
  id: number;
  quiz_id: number;
  student_id: number;
  score: number | null;
  passed: boolean | null;
  started_at: Date;
  completed_at: Date | null;
}

export interface QuizResponse {
  id: number;
  attempt_id: number;
  question_id: number;
  selected_answer_id: number | null;
  is_correct: boolean;
}

export interface CreateQuizInput {
  course_id: number;
  lesson_id?: number | null;
  title: string;
  description?: string | null;
  passing_score?: number;
  time_limit_minutes?: number | null;
}

export interface CreateQuestionInput {
  quiz_id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false';
  position: number;
  points?: number;
  answers: Array<{
    answer_text: string;
    is_correct: boolean;
    position: number;
  }>;
}

// Quiz CRUD operations
export const createQuiz = async (input: CreateQuizInput): Promise<Quiz> => {
  const result = await pool.query(
    `INSERT INTO quizzes (course_id, lesson_id, title, description, passing_score, time_limit_minutes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.course_id,
      input.lesson_id || null,
      input.title,
      input.description || null,
      input.passing_score || 70,
      input.time_limit_minutes || null
    ]
  );
  return result.rows[0];
};

export const getQuizById = async (quizId: number): Promise<Quiz | null> => {
  const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
  return result.rows[0] || null;
};

export const getQuizzesByCourse = async (courseId: number): Promise<Quiz[]> => {
  const result = await pool.query(
    'SELECT * FROM quizzes WHERE course_id = $1 ORDER BY created_at DESC',
    [courseId]
  );
  return result.rows;
};

export const getQuizzesByLesson = async (lessonId: number): Promise<Quiz[]> => {
  const result = await pool.query(
    'SELECT * FROM quizzes WHERE lesson_id = $1 ORDER BY created_at DESC',
    [lessonId]
  );
  return result.rows;
};

export const updateQuiz = async (quizId: number, input: Partial<CreateQuizInput>): Promise<Quiz | null> => {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (input.title !== undefined) {
    fields.push(`title = $${paramCount++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${paramCount++}`);
    values.push(input.description);
  }
  if (input.passing_score !== undefined) {
    fields.push(`passing_score = $${paramCount++}`);
    values.push(input.passing_score);
  }
  if (input.time_limit_minutes !== undefined) {
    fields.push(`time_limit_minutes = $${paramCount++}`);
    values.push(input.time_limit_minutes);
  }

  if (fields.length === 0) return getQuizById(quizId);

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(quizId);

  const result = await pool.query(
    `UPDATE quizzes SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

export const deleteQuiz = async (quizId: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM quizzes WHERE id = $1', [quizId]);
  return result.rowCount ? result.rowCount > 0 : false;
};

// Quiz Question operations
export const createQuestion = async (input: CreateQuestionInput): Promise<QuizQuestion> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert question
    const questionResult = await client.query(
      `INSERT INTO quiz_questions (quiz_id, question_text, question_type, position, points)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.quiz_id, input.question_text, input.question_type, input.position, input.points || 1]
    );
    const question = questionResult.rows[0];

    // Insert answers
    for (const answer of input.answers) {
      await client.query(
        `INSERT INTO quiz_answers (question_id, answer_text, is_correct, position)
         VALUES ($1, $2, $3, $4)`,
        [question.id, answer.answer_text, answer.is_correct, answer.position]
      );
    }

    await client.query('COMMIT');
    return question;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getQuestionsByQuiz = async (quizId: number): Promise<QuizQuestion[]> => {
  const result = await pool.query(
    'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY position',
    [quizId]
  );
  return result.rows;
};

export const getAnswersByQuestion = async (questionId: number): Promise<QuizAnswer[]> => {
  const result = await pool.query(
    'SELECT * FROM quiz_answers WHERE question_id = $1 ORDER BY position',
    [questionId]
  );
  return result.rows;
};

export const deleteQuestion = async (questionId: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM quiz_questions WHERE id = $1', [questionId]);
  return result.rowCount ? result.rowCount > 0 : false;
};

// Quiz Attempt operations
export const createAttempt = async (quizId: number, studentId: number): Promise<QuizAttempt> => {
  const result = await pool.query(
    `INSERT INTO quiz_attempts (quiz_id, student_id, started_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     RETURNING *`,
    [quizId, studentId]
  );
  return result.rows[0];
};

export const getAttemptById = async (attemptId: number): Promise<QuizAttempt | null> => {
  const result = await pool.query('SELECT * FROM quiz_attempts WHERE id = $1', [attemptId]);
  return result.rows[0] || null;
};

export const getAttemptsByStudent = async (studentId: number, quizId: number): Promise<QuizAttempt[]> => {
  const result = await pool.query(
    'SELECT * FROM quiz_attempts WHERE student_id = $1 AND quiz_id = $2 ORDER BY started_at DESC',
    [studentId, quizId]
  );
  return result.rows;
};

export const submitAttempt = async (
  attemptId: number,
  score: number,
  passed: boolean
): Promise<QuizAttempt | null> => {
  const result = await pool.query(
    `UPDATE quiz_attempts
     SET score = $1, passed = $2, completed_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [score, passed, attemptId]
  );
  return result.rows[0] || null;
};

// Quiz Response operations
export const saveResponse = async (
  attemptId: number,
  questionId: number,
  selectedAnswerId: number | null,
  isCorrect: boolean
): Promise<QuizResponse> => {
  const result = await pool.query(
    `INSERT INTO quiz_responses (attempt_id, question_id, selected_answer_id, is_correct)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (attempt_id, question_id)
     DO UPDATE SET selected_answer_id = $3, is_correct = $4
     RETURNING *`,
    [attemptId, questionId, selectedAnswerId, isCorrect]
  );
  return result.rows[0];
};

export const getResponsesByAttempt = async (attemptId: number): Promise<QuizResponse[]> => {
  const result = await pool.query(
    'SELECT * FROM quiz_responses WHERE attempt_id = $1',
    [attemptId]
  );
  return result.rows;
};
