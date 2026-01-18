import { Router } from 'express';
import {
  createModuleHandler,
  createModuleItemHandler,
  deleteModuleHandler,
  deleteModuleItemHandler,
  getModulesForCourse,
  updateModuleHandler,
  updateModuleItemHandler
} from '../controllers/moduleController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/courses/:courseId/modules', authenticate, getModulesForCourse);
router.post(
  '/courses/:courseId/modules',
  authenticate,
  authorizeRoles('admin', 'teacher'),
  createModuleHandler
);
router.put('/modules/:id', authenticate, authorizeRoles('admin', 'teacher'), updateModuleHandler);
router.delete(
  '/modules/:id',
  authenticate,
  authorizeRoles('admin', 'teacher'),
  deleteModuleHandler
);

router.post(
  '/modules/:moduleId/items',
  authenticate,
  authorizeRoles('admin', 'teacher'),
  createModuleItemHandler
);
router.put(
  '/module-items/:id',
  authenticate,
  authorizeRoles('admin', 'teacher'),
  updateModuleItemHandler
);
router.delete(
  '/module-items/:id',
  authenticate,
  authorizeRoles('admin', 'teacher'),
  deleteModuleItemHandler
);

export default router;


