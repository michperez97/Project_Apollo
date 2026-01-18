import pool from '../config/database';
import {
  CreateModuleInput,
  CreateModuleItemInput,
  ModuleItemRecord,
  ModuleRecord,
  ModuleWithItems,
  UpdateModuleInput,
  UpdateModuleItemInput
} from '../types/module';

const buildModulesWithItems = (
  modules: ModuleRecord[],
  items: ModuleItemRecord[]
): ModuleWithItems[] => {
  const itemsByModule = items.reduce<Record<number, ModuleItemRecord[]>>((acc, item) => {
    if (!acc[item.module_id]) acc[item.module_id] = [];
    acc[item.module_id].push(item);
    return acc;
  }, {});

  return modules.map((mod) => ({
    ...mod,
    items: itemsByModule[mod.id]?.sort((a, b) => a.position - b.position) ?? []
  }));
};

export const listModulesWithItems = async (courseId: number): Promise<ModuleWithItems[]> => {
  const modulesResult = await pool.query<ModuleRecord>(
    'SELECT * FROM modules WHERE course_id = $1 ORDER BY position ASC, created_at ASC',
    [courseId]
  );

  const moduleIds = modulesResult.rows.map((m) => m.id);
  if (!moduleIds.length) return [];

  const itemsResult = await pool.query<ModuleItemRecord>(
    'SELECT * FROM module_items WHERE module_id = ANY($1::int[]) ORDER BY position ASC, created_at ASC',
    [moduleIds]
  );

  return buildModulesWithItems(modulesResult.rows, itemsResult.rows);
};

const nextModulePosition = async (courseId: number): Promise<number> => {
  const result = await pool.query<{ max: number }>(
    'SELECT COALESCE(MAX(position), 0) as max FROM modules WHERE course_id = $1',
    [courseId]
  );
  return Number(result.rows[0].max) + 1;
};

const nextItemPosition = async (moduleId: number): Promise<number> => {
  const result = await pool.query<{ max: number }>(
    'SELECT COALESCE(MAX(position), 0) as max FROM module_items WHERE module_id = $1',
    [moduleId]
  );
  return Number(result.rows[0].max) + 1;
};

export const createModule = async (
  courseId: number,
  input: CreateModuleInput
): Promise<ModuleRecord> => {
  const position = await nextModulePosition(courseId);
  const result = await pool.query<ModuleRecord>(
    `INSERT INTO modules (course_id, title, position)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [courseId, input.title, position]
  );
  return result.rows[0];
};

export const updateModule = async (
  id: number,
  data: UpdateModuleInput
): Promise<ModuleRecord | null> => {
  const currentResult = await pool.query<ModuleRecord>('SELECT * FROM modules WHERE id = $1', [id]);
  const current = currentResult.rows[0];
  if (!current) return null;

  const title = data.title ?? current.title;
  const position = data.position ?? current.position;

  const result = await pool.query<ModuleRecord>(
    `UPDATE modules
     SET title = $1,
         position = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING *`,
    [title, position, id]
  );
  return result.rows[0];
};

export const deleteModule = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM modules WHERE id = $1', [id]);
  return result.rowCount > 0;
};

export const createModuleItem = async (
  moduleId: number,
  input: CreateModuleItemInput
): Promise<ModuleItemRecord> => {
  const position = await nextItemPosition(moduleId);
  const result = await pool.query<ModuleItemRecord>(
    `INSERT INTO module_items (module_id, title, type, content_url, content_text, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [moduleId, input.title, input.type, input.content_url ?? null, input.content_text ?? null, position]
  );
  return result.rows[0];
};

export const updateModuleItem = async (
  id: number,
  data: UpdateModuleItemInput
): Promise<ModuleItemRecord | null> => {
  const currentResult = await pool.query<ModuleItemRecord>(
    'SELECT * FROM module_items WHERE id = $1',
    [id]
  );
  const current = currentResult.rows[0];
  if (!current) return null;

  const title = data.title ?? current.title;
  const type = data.type ?? current.type;
  const content_url = data.content_url ?? current.content_url;
  const content_text = data.content_text ?? current.content_text;
  const position = data.position ?? current.position;

  const result = await pool.query<ModuleItemRecord>(
    `UPDATE module_items
     SET title = $1,
         type = $2,
         content_url = $3,
         content_text = $4,
         position = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [title, type, content_url, content_text, position, id]
  );
  return result.rows[0];
};

export const deleteModuleItem = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM module_items WHERE id = $1', [id]);
  return result.rowCount > 0;
};


