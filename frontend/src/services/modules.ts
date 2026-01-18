import { api } from './http';
import { Module, ModuleItem } from '../types';

export const getModules = async (courseId: number): Promise<Module[]> => {
  const { data } = await api.get<{ modules: Module[] }>(`/courses/${courseId}/modules`);
  return data.modules;
};

export const createModule = async (courseId: number, title: string): Promise<Module> => {
  const { data } = await api.post<{ module: Module }>(`/courses/${courseId}/modules`, { title });
  return data.module;
};

export const updateModule = async (
  moduleId: number,
  payload: { title?: string; position?: number }
): Promise<Module> => {
  const { data } = await api.put<{ module: Module }>(`/modules/${moduleId}`, payload);
  return data.module;
};

export const deleteModule = async (moduleId: number): Promise<void> => {
  await api.delete(`/modules/${moduleId}`);
};

export const createModuleItem = async (
  moduleId: number,
  payload: { title: string; type: string; content_url?: string | null; content_text?: string | null }
): Promise<ModuleItem> => {
  const { data } = await api.post<{ item: ModuleItem }>(`/modules/${moduleId}/items`, payload);
  return data.item;
};

export const updateModuleItem = async (
  itemId: number,
  payload: { title?: string; type?: string; content_url?: string | null; content_text?: string | null; position?: number }
): Promise<ModuleItem> => {
  const { data } = await api.put<{ item: ModuleItem }>(`/module-items/${itemId}`, payload);
  return data.item;
};

export const deleteModuleItem = async (itemId: number): Promise<void> => {
  await api.delete(`/module-items/${itemId}`);
};


