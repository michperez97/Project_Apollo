import pool from '../config/database';

export type LessonType = 'video' | 'text' | 'quiz' | 'scorm';

export interface CourseLessonRecord {
  id: number;
  course_id: number;
  section_id: number;
  title: string;
  lesson_type: LessonType;
  position: number;
  video_url: string | null;
  content: string | null;
  duration_seconds: number | null;
  is_preview: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CourseLessonInput {
  title: string;
  lesson_type: LessonType;
  position?: number;
  video_url?: string | null;
  content?: string | null;
  duration_seconds?: number | null;
  is_preview?: boolean;
}

export const listLessonsByCourse = async (courseId: number): Promise<CourseLessonRecord[]> => {
  const result = await pool.query<CourseLessonRecord>(
    'SELECT * FROM course_lessons WHERE course_id = $1 ORDER BY section_id, position ASC',
    [courseId]
  );
  return result.rows;
};

export const listLessonsBySection = async (sectionId: number): Promise<CourseLessonRecord[]> => {
  const result = await pool.query<CourseLessonRecord>(
    'SELECT * FROM course_lessons WHERE section_id = $1 ORDER BY position ASC',
    [sectionId]
  );
  return result.rows;
};

export const getLessonById = async (id: number): Promise<CourseLessonRecord | null> => {
  const result = await pool.query<CourseLessonRecord>(
    'SELECT * FROM course_lessons WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
};

export const createLesson = async (
  courseId: number,
  sectionId: number,
  data: CourseLessonInput
): Promise<CourseLessonRecord> => {
  const result = await pool.query<CourseLessonRecord>(
    `INSERT INTO course_lessons (course_id, section_id, title, lesson_type, position, video_url, content, duration_seconds, is_preview)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      courseId,
      sectionId,
      data.title,
      data.lesson_type,
      data.position ?? 0,
      data.video_url ?? null,
      data.content ?? null,
      data.duration_seconds ?? null,
      data.is_preview ?? false
    ]
  );
  return result.rows[0];
};

export const updateLesson = async (
  id: number,
  data: Partial<CourseLessonInput>
): Promise<CourseLessonRecord | null> => {
  const result = await pool.query<CourseLessonRecord>(
    `UPDATE course_lessons
     SET title = COALESCE($1, title),
         lesson_type = COALESCE($2, lesson_type),
         position = COALESCE($3, position),
         video_url = COALESCE($4, video_url),
         content = COALESCE($5, content),
         duration_seconds = COALESCE($6, duration_seconds),
         is_preview = COALESCE($7, is_preview),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [
      data.title ?? null,
      data.lesson_type ?? null,
      data.position ?? null,
      data.video_url,
      data.content,
      data.duration_seconds,
      data.is_preview ?? null,
      id
    ]
  );
  return result.rows[0] ?? null;
};

export const deleteLesson = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM course_lessons WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const countLessonsByCourse = async (courseId: number): Promise<number> => {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM course_lessons WHERE course_id = $1',
    [courseId]
  );
  return parseInt(result.rows[0].count, 10);
};
