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
  authorizeRoles('admin', 'instructor'),
  createModuleHandler
);
router.put('/modules/:id', authenticate, authorizeRoles('admin', 'instructor'), updateModuleHandler);
router.delete(
  '/modules/:id',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  deleteModuleHandler
);

router.post(
  '/modules/:moduleId/items',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  createModuleItemHandler
);
router.put(
  '/module-items/:id',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  updateModuleItemHandler
);
router.delete(
  '/module-items/:id',
  authenticate,
  authorizeRoles('admin', 'instructor'),
  deleteModuleItemHandler
);

export default router;
