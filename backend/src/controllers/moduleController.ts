import { Response, NextFunction } from 'express';
import {
  createModule,
  createModuleItem,
  deleteModule,
  deleteModuleItem,
  listModulesWithItems,
  updateModule,
  updateModuleItem
} from '../models/moduleModel';
import { AuthenticatedRequest } from '../types/auth';
import { CreateModuleItemInput, ModuleItemType } from '../types/module';

export const getModulesForCourse = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const modules = await listModulesWithItems(courseId);
    return res.json({ modules });
  } catch (error) {
    return next(error);
  }
};

export const createModuleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const courseId = Number(req.params.courseId);
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const module = await createModule(courseId, { title });
    return res.status(201).json({ module });
  } catch (error) {
    return next(error);
  }
};

export const updateModuleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const moduleId = Number(req.params.id);
    const updated = await updateModule(moduleId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Module not found' });
    }
    return res.json({ module: updated });
  } catch (error) {
    return next(error);
  }
};

export const deleteModuleHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const moduleId = Number(req.params.id);
    const deleted = await deleteModule(moduleId);
    if (!deleted) {
      return res.status(404).json({ error: 'Module not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

export const createModuleItemHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const moduleId = Number(req.params.moduleId);
    const payload: CreateModuleItemInput = req.body;

    if (!payload.title || !payload.type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const allowedTypes: ModuleItemType[] = ['text', 'link', 'file'];
    if (!allowedTypes.includes(payload.type)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    const item = await createModuleItem(moduleId, payload);
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
};

export const updateModuleItemHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemId = Number(req.params.id);
    const updated = await updateModuleItem(itemId, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Module item not found' });
    }
    return res.json({ item: updated });
  } catch (error) {
    return next(error);
  }
};

export const deleteModuleItemHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const itemId = Number(req.params.id);
    const deleted = await deleteModuleItem(itemId);
    if (!deleted) {
      return res.status(404).json({ error: 'Module item not found' });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};


