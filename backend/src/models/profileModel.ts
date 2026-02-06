import pool from '../config/database';

export interface InstructorProfileRecord {
  id: number;
  user_id: number;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  specializations: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  created_at: Date;
  updated_at: Date;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface UpsertProfileInput {
  avatar_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  specializations?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
}

export const findProfileByUserId = async (userId: number): Promise<InstructorProfileRecord | null> => {
  const result = await pool.query<InstructorProfileRecord>(
    `SELECT ip.*, u.first_name, u.last_name, u.email
     FROM instructor_profiles ip
     JOIN users u ON u.id = ip.user_id
     WHERE ip.user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
};

export const upsertProfile = async (userId: number, data: UpsertProfileInput): Promise<InstructorProfileRecord> => {
  const result = await pool.query<InstructorProfileRecord>(
    `INSERT INTO instructor_profiles (user_id, avatar_url, headline, bio, specializations, website_url, linkedin_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id)
     DO UPDATE SET
       avatar_url = COALESCE($2, instructor_profiles.avatar_url),
       headline = COALESCE($3, instructor_profiles.headline),
       bio = COALESCE($4, instructor_profiles.bio),
       specializations = COALESCE($5, instructor_profiles.specializations),
       website_url = COALESCE($6, instructor_profiles.website_url),
       linkedin_url = COALESCE($7, instructor_profiles.linkedin_url),
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      userId,
      data.avatar_url ?? null,
      data.headline ?? null,
      data.bio ?? null,
      data.specializations ?? null,
      data.website_url ?? null,
      data.linkedin_url ?? null
    ]
  );
  return result.rows[0];
};

export interface PublicProfileRecord extends InstructorProfileRecord {
  courses?: Array<{
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    price: number | null;
    thumbnail_url: string | null;
  }>;
}

export const findPublicProfile = async (userId: number): Promise<InstructorProfileRecord | null> => {
  const result = await pool.query<InstructorProfileRecord>(
    `SELECT ip.*, u.first_name, u.last_name
     FROM instructor_profiles ip
     JOIN users u ON u.id = ip.user_id
     WHERE ip.user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
};

export const findApprovedCoursesByInstructor = async (instructorId: number) => {
  const result = await pool.query(
    `SELECT id, title, description, category, price, thumbnail_url
     FROM courses
     WHERE instructor_id = $1 AND status = 'approved'
     ORDER BY created_at DESC`,
    [instructorId]
  );
  return result.rows;
};
