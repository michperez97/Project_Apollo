export type ModuleItemType = 'text' | 'link' | 'file';

export interface ModuleRecord {
  id: number;
  course_id: number;
  title: string;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface ModuleItemRecord {
  id: number;
  module_id: number;
  title: string;
  type: ModuleItemType;
  content_url: string | null;
  content_text: string | null;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface ModuleWithItems extends ModuleRecord {
  items: ModuleItemRecord[];
}

export interface CreateModuleInput {
  title: string;
}

export interface UpdateModuleInput {
  title?: string;
  position?: number;
}

export interface CreateModuleItemInput {
  title: string;
  type: ModuleItemType;
  content_url?: string | null;
  content_text?: string | null;
}

export interface UpdateModuleItemInput extends Partial<CreateModuleItemInput> {}


