import pool from '../config/database';

export type ScormAttemptStatus = 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';

type RuntimeState = Record<string, string>;

interface ScormAttemptRow {
  id: number;
  scorm_package_id: number;
  lesson_id: number;
  student_id: number;
  launch_token: string;
  status: ScormAttemptStatus;
  completion_status: string | null;
  success_status: string | null;
  score_raw: string | null;
  total_time_seconds: number;
  lesson_location: string | null;
  suspend_data: string | null;
  runtime_state: RuntimeState | null;
  started_at: Date;
  completed_at: Date | null;
  last_accessed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ScormAttemptRecord {
  id: number;
  scorm_package_id: number;
  lesson_id: number;
  student_id: number;
  launch_token: string;
  status: ScormAttemptStatus;
  completion_status: string | null;
  success_status: string | null;
  score_raw: number | null;
  total_time_seconds: number;
  lesson_location: string | null;
  suspend_data: string | null;
  runtime_state: RuntimeState;
  started_at: Date;
  completed_at: Date | null;
  last_accessed_at: Date;
  created_at: Date;
  updated_at: Date;
}

const mapAttempt = (row: ScormAttemptRow): ScormAttemptRecord => ({
  id: row.id,
  scorm_package_id: row.scorm_package_id,
  lesson_id: row.lesson_id,
  student_id: row.student_id,
  launch_token: row.launch_token,
  status: row.status,
  completion_status: row.completion_status,
  success_status: row.success_status,
  score_raw: row.score_raw === null ? null : Number(row.score_raw),
  total_time_seconds: row.total_time_seconds,
  lesson_location: row.lesson_location,
  suspend_data: row.suspend_data,
  runtime_state: row.runtime_state ?? {},
  started_at: row.started_at,
  completed_at: row.completed_at,
  last_accessed_at: row.last_accessed_at,
  created_at: row.created_at,
  updated_at: row.updated_at
});

export const getScormAttemptByStudentAndLesson = async (
  studentId: number,
  lessonId: number
): Promise<ScormAttemptRecord | null> => {
  const result = await pool.query<ScormAttemptRow>(
    'SELECT * FROM scorm_attempts WHERE student_id = $1 AND lesson_id = $2 LIMIT 1',
    [studentId, lessonId]
  );
  const row = result.rows[0];
  return row ? mapAttempt(row) : null;
};

export const createScormAttempt = async (input: {
  scorm_package_id: number;
  lesson_id: number;
  student_id: number;
  launch_token: string;
}): Promise<ScormAttemptRecord> => {
  const result = await pool.query<ScormAttemptRow>(
    `INSERT INTO scorm_attempts (
      scorm_package_id,
      lesson_id,
      student_id,
      launch_token
    )
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.scorm_package_id, input.lesson_id, input.student_id, input.launch_token]
  );

  return mapAttempt(result.rows[0]);
};

export const rotateScormAttemptLaunchToken = async (
  attemptId: number,
  launchToken: string
): Promise<ScormAttemptRecord | null> => {
  const result = await pool.query<ScormAttemptRow>(
    `UPDATE scorm_attempts
     SET launch_token = $1,
         last_accessed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [launchToken, attemptId]
  );
  const row = result.rows[0];
  return row ? mapAttempt(row) : null;
};

export interface ScormAttemptLaunchContext extends ScormAttemptRecord {
  package_storage_path: string;
  package_launch_path: string;
  package_title: string;
  package_version: string;
}

export const getScormAttemptLaunchContext = async (
  attemptId: number,
  launchToken: string
): Promise<ScormAttemptLaunchContext | null> => {
  const result = await pool.query<
    ScormAttemptRow & {
      package_storage_path: string;
      package_launch_path: string;
      package_title: string;
      package_version: string;
    }
  >(
    `SELECT sa.*,
            sp.storage_path AS package_storage_path,
            sp.launch_path AS package_launch_path,
            sp.title AS package_title,
            sp.scorm_version AS package_version
     FROM scorm_attempts sa
     JOIN scorm_packages sp ON sp.id = sa.scorm_package_id
     WHERE sa.id = $1 AND sa.launch_token = $2
     LIMIT 1`,
    [attemptId, launchToken]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    ...mapAttempt(row),
    package_storage_path: row.package_storage_path,
    package_launch_path: row.package_launch_path,
    package_title: row.package_title,
    package_version: row.package_version
  };
};

export const updateScormAttemptRuntime = async (
  attemptId: number,
  input: {
    runtime_state: RuntimeState;
    status: ScormAttemptStatus;
    completion_status: string | null;
    success_status: string | null;
    score_raw: number | null;
    total_time_seconds: number;
    lesson_location: string | null;
    suspend_data: string | null;
    completed_at: Date | null;
  }
): Promise<ScormAttemptRecord | null> => {
  const result = await pool.query<ScormAttemptRow>(
    `UPDATE scorm_attempts
     SET runtime_state = $1::jsonb,
         status = $2,
         completion_status = $3,
         success_status = $4,
         score_raw = $5,
         total_time_seconds = $6,
         lesson_location = $7,
         suspend_data = $8,
         completed_at = CASE
           WHEN $9::timestamp IS NOT NULL THEN $9
           WHEN status IN ('completed', 'passed', 'failed') THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
           ELSE completed_at
         END,
         last_accessed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING *`,
    [
      JSON.stringify(input.runtime_state),
      input.status,
      input.completion_status,
      input.success_status,
      input.score_raw,
      input.total_time_seconds,
      input.lesson_location,
      input.suspend_data,
      input.completed_at,
      attemptId
    ]
  );
  const row = result.rows[0];
  return row ? mapAttempt(row) : null;
};
