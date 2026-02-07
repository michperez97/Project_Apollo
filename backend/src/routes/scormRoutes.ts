import { Router } from 'express';
import {
  importScormPackageHandler,
  startScormAttemptHandler,
  getScormRuntimeStateHandler,
  updateScormRuntimeStateHandler,
  serveScormLaunchHandler,
  serveScormAssetHandler
} from '../controllers/scormController';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.post('/import', authenticate, authorizeRoles('admin', 'instructor'), importScormPackageHandler);
router.post('/lessons/:lessonId/attempt', authenticate, authorizeRoles('student'), startScormAttemptHandler);

router.get('/runtime/:token/:attemptId/launch', serveScormLaunchHandler);
router.get('/runtime/:token/:attemptId/state', getScormRuntimeStateHandler);
router.post('/runtime/:token/:attemptId/state', updateScormRuntimeStateHandler);
router.get('/runtime/:token/:attemptId/assets/*', serveScormAssetHandler);

export default router;
