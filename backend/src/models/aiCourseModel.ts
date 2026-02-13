import pool from '../config/database';

export type AiCourseStatus = 'generating' | 'ready' | 'failed';

export type AiCourseContent = Record<string, unknown>;

export interface AiCourseRecord {
  id: number;
  student_id: number;
  title: string;
  description: string | null;
  category: string | null;
  status: AiCourseStatus;
  content: AiCourseContent;
  prompt: string;
  model_used: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AiCourseCreateInput {
  student_id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  prompt: string;
  model_used?: string | null;
  content?: AiCourseContent;
}

export const createAiCourse = async (input: AiCourseCreateInput): Promise<AiCourseRecord> => {
  const title = input.title.trim();

  const result = await pool.query<AiCourseRecord>(
    `INSERT INTO ai_courses (student_id, title, description, category, status, content, prompt, model_used)
     VALUES ($1, $2, $3, $4, 'generating', $5::jsonb, $6, $7)
     RETURNING *`,
    [
      input.student_id,
      title,
      input.description ?? null,
      input.category ?? null,
      JSON.stringify(input.content ?? {}),
      input.prompt,
      input.model_used ?? null
    ]
  );

  return result.rows[0];
};

export const updateAiCourseContent = async (
  id: number,
  content: AiCourseContent,
  status: AiCourseStatus
): Promise<AiCourseRecord | null> => {
  const result = await pool.query<AiCourseRecord>(
    `UPDATE ai_courses
     SET content = $1::jsonb,
         status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [JSON.stringify(content), status, id]
  );
  return result.rows[0] ?? null;
};

export const updateAiCourseMeta = async (
  id: number,
  title: string,
  description: string | null,
  category: string | null
): Promise<AiCourseRecord | null> => {
  const result = await pool.query<AiCourseRecord>(
    `UPDATE ai_courses
     SET title = $1,
         description = $2,
         category = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [title.trim(), description ?? null, category ?? null, id]
  );
  return result.rows[0] ?? null;
};

export const updateAiCourseStatus = async (
  id: number,
  status: AiCourseStatus,
  errorReason?: string | null
): Promise<AiCourseRecord | null> => {
  const hasError = typeof errorReason === 'string' && errorReason.trim().length > 0;
  const errorPayload = hasError ? JSON.stringify({ error: errorReason }) : null;
  const result = await pool.query<AiCourseRecord>(
    `UPDATE ai_courses
     SET status = $1,
         content = CASE WHEN $2 THEN $3::jsonb ELSE content END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [status, hasError, errorPayload, id]
  );
  return result.rows[0] ?? null;
};

export const updateAiCourseModelUsed = async (
  id: number,
  modelUsed: string | null
): Promise<AiCourseRecord | null> => {
  const result = await pool.query<AiCourseRecord>(
    `UPDATE ai_courses
     SET model_used = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [modelUsed, id]
  );
  return result.rows[0] ?? null;
};

export const getAiCourseById = async (id: number): Promise<AiCourseRecord | null> => {
  const result = await pool.query<AiCourseRecord>('SELECT * FROM ai_courses WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const listAiCoursesByStudent = async (studentId: number): Promise<AiCourseRecord[]> => {
  const result = await pool.query<AiCourseRecord>(
    'SELECT * FROM ai_courses WHERE student_id = $1 ORDER BY created_at DESC',
    [studentId]
  );
  return result.rows;
};

export const deleteAiCourse = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM ai_courses WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
