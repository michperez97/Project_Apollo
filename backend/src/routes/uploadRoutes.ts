import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getUploadSignature } from '../controllers/uploadController';

const router = Router();

router.get('/uploads/sign', authenticate, getUploadSignature);

export default router;


