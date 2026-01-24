import pool from '../config/database';

export interface CourseSectionRecord {
  id: number;
  course_id: number;
  title: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface CourseSectionInput {
  title: string;
  position?: number;
}

export const listSectionsByCourse = async (courseId: number): Promise<CourseSectionRecord[]> => {
  const result = await pool.query<CourseSectionRecord>(
    'SELECT * FROM course_sections WHERE course_id = $1 ORDER BY position ASC',
    [courseId]
  );
  return result.rows;
};

export const getSectionById = async (id: number): Promise<CourseSectionRecord | null> => {
  const result = await pool.query<CourseSectionRecord>(
    'SELECT * FROM course_sections WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
};

export const createSection = async (
  courseId: number,
  data: CourseSectionInput
): Promise<CourseSectionRecord> => {
  const result = await pool.query<CourseSectionRecord>(
    `INSERT INTO course_sections (course_id, title, position)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [courseId, data.title, data.position ?? 0]
  );
  return result.rows[0];
};

export const updateSection = async (
  id: number,
  data: Partial<CourseSectionInput>
): Promise<CourseSectionRecord | null> => {
  const result = await pool.query<CourseSectionRecord>(
    `UPDATE course_sections
     SET title = COALESCE($1, title),
         position = COALESCE($2, position),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [data.title ?? null, data.position ?? null, id]
  );
  return result.rows[0] ?? null;
};

export const deleteSection = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM course_sections WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
