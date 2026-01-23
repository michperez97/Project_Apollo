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
  created_at: Date;
  updated_at: Date;
  code?: string;
  name?: string;
  credit_hours?: number;
  price_per_credit?: number;
  teacher_id?: number | null;
  semester?: string;
  year?: number;
}

export interface CourseInput {
  title: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  thumbnail_url?: string | null;
  status?: CourseStatus;
  instructor_id?: number | null;
  code?: string;
  name?: string;
  credit_hours?: number;
  price_per_credit?: number;
  teacher_id?: number | null;
  semester?: string;
  year?: number;
}

const normalizeTitle = (title: string) => title.trim();

const generateCourseCode = (title: string) => {
  const normalized = title
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = Date.now().toString().slice(-4);
  const base = normalized || 'COURSE';
  return `${base.slice(0, 12)}-${suffix}`.slice(0, 20);
};

const toLegacyFields = (input: CourseInput) => {
  const legacyName = input.name ?? input.title;
  const legacyCode = input.code ?? generateCourseCode(legacyName);
  const legacySemester = input.semester ?? 'On Demand';
  const legacyYear = input.year ?? new Date().getFullYear();
  const price = input.price ?? 0;
  const legacyCreditHours = input.credit_hours ?? 1;
  const legacyPricePerCredit = input.price_per_credit ?? price;
  const legacyTeacherId = input.teacher_id ?? input.instructor_id ?? null;

  return {
    legacyName,
    legacyCode,
    legacySemester,
    legacyYear,
    legacyCreditHours,
    legacyPricePerCredit,
    legacyTeacherId
  };
};

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
  const title = normalizeTitle(input.title);
  const {
    legacyName,
    legacyCode,
    legacySemester,
    legacyYear,
    legacyCreditHours,
    legacyPricePerCredit,
    legacyTeacherId
  } = toLegacyFields({ ...input, title });

  const result = await pool.query<CourseRecord>(
    `INSERT INTO courses (
      code,
      name,
      description,
      credit_hours,
      price_per_credit,
      teacher_id,
      semester,
      year,
      title,
      category,
      price,
      thumbnail_url,
      status,
      instructor_id
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      legacyCode,
      legacyName,
      input.description ?? null,
      legacyCreditHours,
      legacyPricePerCredit,
      legacyTeacherId,
      legacySemester,
      legacyYear,
      title,
      input.category ?? null,
      input.price ?? null,
      input.thumbnail_url ?? null,
      input.status ?? 'draft',
      input.instructor_id ?? legacyTeacherId
    ]
  );

  return result.rows[0];
};

export const updateCourse = async (id: number, data: Partial<CourseInput>): Promise<CourseRecord | null> => {
  const existing = await getCourseById(id);
  if (!existing) {
    return null;
  }

  const title = data.title ? normalizeTitle(data.title) : existing.title ?? existing.name ?? '';
  const merged: CourseInput = {
    title,
    description: data.description ?? existing.description,
    category: data.category ?? existing.category,
    price: data.price ?? existing.price,
    thumbnail_url: data.thumbnail_url ?? existing.thumbnail_url,
    status: data.status ?? existing.status,
    instructor_id: data.instructor_id ?? existing.instructor_id ?? existing.teacher_id ?? null,
    code: data.code ?? existing.code,
    name: data.name ?? existing.name ?? title,
    credit_hours: data.credit_hours ?? existing.credit_hours,
    price_per_credit: data.price_per_credit ?? existing.price_per_credit,
    teacher_id: data.teacher_id ?? existing.teacher_id,
    semester: data.semester ?? existing.semester,
    year: data.year ?? existing.year
  };

  const {
    legacyName,
    legacyCode,
    legacySemester,
    legacyYear,
    legacyCreditHours,
    legacyPricePerCredit,
    legacyTeacherId
  } = toLegacyFields(merged);

  const result = await pool.query<CourseRecord>(
    `UPDATE courses
     SET code = $1,
         name = $2,
         description = $3,
         credit_hours = $4,
         price_per_credit = $5,
         teacher_id = $6,
         semester = $7,
         year = $8,
         title = $9,
         category = $10,
         price = $11,
         thumbnail_url = $12,
         status = $13,
         instructor_id = $14,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $15
     RETURNING *`,
    [
      legacyCode,
      legacyName,
      merged.description ?? null,
      legacyCreditHours,
      legacyPricePerCredit,
      legacyTeacherId,
      legacySemester,
      legacyYear,
      title,
      merged.category ?? null,
      merged.price ?? null,
      merged.thumbnail_url ?? null,
      merged.status ?? 'draft',
      merged.instructor_id ?? legacyTeacherId,
      id
    ]
  );

  return result.rows[0] ?? null;
};

export const deleteCourse = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM courses WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
