import { Router } from 'express';
import {
  getStudentCertificates,
  getCertificate,
  verifyCertificate,
  generateCertificate,
  deleteCertificate
} from '../controllers/certificateController';
import { authenticate, authorizeRoles, optionalAuthenticate } from '../middleware/authMiddleware';

const router = Router();

// Student certificate routes
router.get('/student/:studentId', authenticate, getStudentCertificates);
router.get('/:id', authenticate, getCertificate);

// Public certificate verification (no auth required)
router.get('/verify/:certificateNumber', verifyCertificate);

// Admin/instructor certificate management
router.post('/generate', authenticate, authorizeRoles('admin', 'instructor'), generateCertificate);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteCertificate);

export default router;
