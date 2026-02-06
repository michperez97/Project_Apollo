import { Router } from 'express';
import { getMyProfile, updateMyProfile, getPublicProfile } from '../controllers/profileController';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, authorizeRoles('instructor', 'admin'), updateMyProfile);
router.get('/:userId', optionalAuthenticate, getPublicProfile);

export default router;
