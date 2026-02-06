import pool from '../config/database';

export type CourseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface CourseRecord {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  price: number | null;
  thumbnail_url: string | null;
  status: CourseStatus;
  instructor_id: number | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CourseInput {
  title: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  thumbnail_url?: string | null;
  status?: CourseStatus;
  instructor_id?: number | null;
}

export const listCourses = async (): Promise<CourseRecord[]> => {
  const result = await pool.query<CourseRecord>('SELECT * FROM courses ORDER BY created_at DESC');
  return result.rows;
};

export const listPublishedCourses = async (): Promise<CourseRecord[]> => {
  const result = await pool.query<CourseRecord>(
    "SELECT * FROM courses WHERE status = 'approved' ORDER BY created_at DESC"
  );
  return result.rows;
};

export const searchPublishedCourses = async (
  query: string,
  limit = 5
): Promise<CourseRecord[]> => {
  const cleaned = query.trim();
  if (!cleaned) {
    return [];
  }

  const term = `%${cleaned}%`;
  const result = await pool.query<CourseRecord>(
    `SELECT * FROM courses
     WHERE status = 'approved'
       AND (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
     ORDER BY created_at DESC
     LIMIT $2`,
    [term, limit]
  );
  return result.rows;
};

export const getCourseById = async (id: number): Promise<CourseRecord | null> => {
  const result = await pool.query<CourseRecord>('SELECT * FROM courses WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const getPublishedCourseById = async (id: number): Promise<CourseRecord | null> => {
  const result = await pool.query<CourseRecord>(
    "SELECT * FROM courses WHERE id = $1 AND status = 'approved'",
    [id]
  );
  return result.rows[0] ?? null;
};

export const createCourse = async (input: CourseInput): Promise<CourseRecord> => {
  const title = input.title.trim();

  const result = await pool.query<CourseRecord>(
    `INSERT INTO courses (title, description, category, price, thumbnail_url, status, instructor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      title,
      input.description ?? null,
      input.category ?? null,
      input.price ?? null,
      input.thumbnail_url ?? null,
      input.status ?? 'draft',
      input.instructor_id ?? null
    ]
  );

  return result.rows[0];
};

export const updateCourse = async (id: number, data: Partial<CourseInput>): Promise<CourseRecord | null> => {
  const existing = await getCourseById(id);
  if (!existing) {
    return null;
  }

  const title = data.title ? data.title.trim() : existing.title;
  const description = data.description ?? existing.description;
  const category = data.category ?? existing.category;
  const price = data.price ?? existing.price;
  const thumbnail_url = data.thumbnail_url ?? existing.thumbnail_url;
  const status = data.status ?? existing.status;
  const instructor_id = data.instructor_id ?? existing.instructor_id;

  const result = await pool.query<CourseRecord>(
    `UPDATE courses
     SET title = $1,
         description = $2,
         category = $3,
         price = $4,
         thumbnail_url = $5,
         status = $6,
         instructor_id = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $8
     RETURNING *`,
    [
      title,
      description ?? null,
      category ?? null,
      price ?? null,
      thumbnail_url ?? null,
      status ?? 'draft',
      instructor_id ?? null,
      id
    ]
  );

  return result.rows[0] ?? null;
};

export const deleteCourse = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM courses WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const listCoursesByInstructor = async (instructorId: number): Promise<CourseRecord[]> => {
  const result = await pool.query<CourseRecord>(
    'SELECT * FROM courses WHERE instructor_id = $1 ORDER BY created_at DESC',
    [instructorId]
  );
  return result.rows;
};

export const listPendingCourses = async (): Promise<CourseRecord[]> => {
  const result = await pool.query<CourseRecord>(
    "SELECT * FROM courses WHERE status = 'pending' ORDER BY created_at ASC"
  );
  return result.rows;
};

export const updateCourseStatus = async (
  courseId: number,
  status: CourseStatus,
  publishedAt: Date | null | undefined = undefined
): Promise<CourseRecord | null> => {
  // If publishedAt is explicitly passed (even null), set it directly
  // If undefined, keep existing value
  const setPublishedAt = publishedAt !== undefined;
  const result = await pool.query<CourseRecord>(
    `UPDATE courses
     SET status = $1,
         published_at = CASE WHEN $2 THEN $3 ELSE published_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [status, setPublishedAt, publishedAt ?? null, courseId]
  );
  return result.rows[0] ?? null;
};
