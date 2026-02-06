import pool from '../config/database';

export interface AnnouncementRecord {
  id: number;
  course_id: number;
  teacher_id: number;
  title: string;
  message: string;
  created_at: Date;
  updated_at: Date;
}

export interface AnnouncementInput {
  course_id: number;
  teacher_id: number;
  title: string;
  message: string;
}

export const createAnnouncement = async (input: AnnouncementInput): Promise<AnnouncementRecord> => {
  const { course_id, teacher_id, title, message } = input;
  const result = await pool.query<AnnouncementRecord>(
    `INSERT INTO announcements (course_id, teacher_id, title, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [course_id, teacher_id, title, message]
  );
  return result.rows[0];
};

export const listAnnouncementsByCourse = async (courseId: number): Promise<AnnouncementRecord[]> => {
  const result = await pool.query<AnnouncementRecord>(
    `SELECT * FROM announcements
     WHERE course_id = $1
     ORDER BY created_at DESC`,
    [courseId]
  );
  return result.rows;
};

export const listAllAnnouncements = async (): Promise<AnnouncementRecord[]> => {
  const result = await pool.query<AnnouncementRecord>(
    `SELECT * FROM announcements
     ORDER BY created_at DESC`
  );
  return result.rows;
};

export const getAnnouncementById = async (id: number): Promise<AnnouncementRecord | null> => {
  const result = await pool.query<AnnouncementRecord>(
    `SELECT * FROM announcements WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const updateAnnouncement = async (
  id: number,
  updates: { title?: string; message?: string }
): Promise<AnnouncementRecord | null> => {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(updates.title);
  }

  if (updates.message !== undefined) {
    fields.push(`message = $${paramIndex++}`);
    values.push(updates.message);
  }

  if (fields.length === 0) {
    return getAnnouncementById(id);
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await pool.query<AnnouncementRecord>(
    `UPDATE announcements
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] ?? null;
};

export const deleteAnnouncement = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};
