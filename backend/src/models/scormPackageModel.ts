import pool from '../config/database';

export interface ScormPackageRecord {
  id: number;
  course_id: number;
  section_id: number;
  lesson_id: number;
  title: string;
  package_url: string;
  storage_path: string;
  manifest_path: string;
  launch_path: string;
  scorm_version: string;
  manifest_identifier: string | null;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface ScormPackageInput {
  course_id: number;
  section_id: number;
  lesson_id: number;
  title: string;
  package_url: string;
  storage_path: string;
  manifest_path: string;
  launch_path: string;
  scorm_version: string;
  manifest_identifier?: string | null;
  created_by?: number | null;
}

export const createScormPackage = async (input: ScormPackageInput): Promise<ScormPackageRecord> => {
  const result = await pool.query<ScormPackageRecord>(
    `INSERT INTO scorm_packages (
      course_id,
      section_id,
      lesson_id,
      title,
      package_url,
      storage_path,
      manifest_path,
      launch_path,
      scorm_version,
      manifest_identifier,
      created_by
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.course_id,
      input.section_id,
      input.lesson_id,
      input.title,
      input.package_url,
      input.storage_path,
      input.manifest_path,
      input.launch_path,
      input.scorm_version,
      input.manifest_identifier ?? null,
      input.created_by ?? null
    ]
  );

  return result.rows[0];
};

export const getScormPackageByLessonId = async (
  lessonId: number
): Promise<ScormPackageRecord | null> => {
  const result = await pool.query<ScormPackageRecord>(
    'SELECT * FROM scorm_packages WHERE lesson_id = $1 LIMIT 1',
    [lessonId]
  );
  return result.rows[0] ?? null;
};

export interface ScormPackageWithLessonContext extends ScormPackageRecord {
  lesson_course_id: number;
}

export const getScormPackageWithLessonContextByLessonId = async (
  lessonId: number
): Promise<ScormPackageWithLessonContext | null> => {
  const result = await pool.query<ScormPackageWithLessonContext>(
    `SELECT sp.*,
            cl.course_id AS lesson_course_id
     FROM scorm_packages sp
     JOIN course_lessons cl ON cl.id = sp.lesson_id
     WHERE sp.lesson_id = $1
     LIMIT 1`,
    [lessonId]
  );
  return result.rows[0] ?? null;
};
