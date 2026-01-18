import pool from '../config/database';

export interface CourseRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  credit_hours: number;
  price_per_credit: number;
  teacher_id: number | null;
  semester: string;
  year: number;
  created_at: Date;
  updated_at: Date;
}

export interface CourseInput {
  code: string;
  name: string;
  description?: string;
  credit_hours: number;
  price_per_credit: number;
  teacher_id?: number | null;
  semester: string;
  year: number;
}

export const listCourses = async (): Promise<CourseRecord[]> => {
  const result = await pool.query<CourseRecord>('SELECT * FROM courses ORDER BY created_at DESC');
  return result.rows;
};

export const getCourseById = async (id: number): Promise<CourseRecord | null> => {
  const result = await pool.query<CourseRecord>('SELECT * FROM courses WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const createCourse = async (input: CourseInput): Promise<CourseRecord> => {
  const {
    code,
    name,
    description = null,
    credit_hours,
    price_per_credit,
    teacher_id = null,
    semester,
    year
  } = input;

  const result = await pool.query<CourseRecord>(
    `INSERT INTO courses (code, name, description, credit_hours, price_per_credit, teacher_id, semester, year)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [code, name, description, credit_hours, price_per_credit, teacher_id, semester, year]
  );

  return result.rows[0];
};

export const updateCourse = async (id: number, data: Partial<CourseInput>): Promise<CourseRecord | null> => {
  const existing = await getCourseById(id);
  if (!existing) {
    return null;
  }

  const updated: CourseInput = {
    code: data.code ?? existing.code,
    name: data.name ?? existing.name,
    description: data.description ?? existing.description ?? undefined,
    credit_hours: data.credit_hours ?? existing.credit_hours,
    price_per_credit: data.price_per_credit ?? existing.price_per_credit,
    teacher_id: data.teacher_id ?? existing.teacher_id ?? undefined,
    semester: data.semester ?? existing.semester,
    year: data.year ?? existing.year
  };

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
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $9
     RETURNING *`,
    [
      updated.code,
      updated.name,
      updated.description ?? null,
      updated.credit_hours,
      updated.price_per_credit,
      updated.teacher_id ?? null,
      updated.semester,
      updated.year,
      id
    ]
  );

  return result.rows[0];
};

export const deleteCourse = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM courses WHERE id = $1', [id]);
  return result.rowCount > 0;
};


