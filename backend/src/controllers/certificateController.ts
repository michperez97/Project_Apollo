import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import * as certificateModel from '../models/certificateModel';

// Get all certificates for a student
export const getStudentCertificates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!Number.isFinite(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }

    // Students can only view their own certificates, admins can view any
    if (req.user?.role !== 'admin' && req.user?.sub !== studentId) {
      return res.status(403).json({ error: 'Not authorized to view these certificates' });
    }

    const certificates = await certificateModel.getCertificatesByStudent(studentId);
    return res.json({ certificates });
  } catch (error) {
    return next(error);
  }
};

// Get certificate by ID
export const getCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const certificateId = Number(req.params.id);
    if (!Number.isFinite(certificateId)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const certificate = await certificateModel.getCertificateById(certificateId);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Students can only view their own certificates
    if (req.user?.role !== 'admin' && req.user?.sub !== certificate.student_id) {
      return res.status(403).json({ error: 'Not authorized to view this certificate' });
    }

    return res.json({ certificate });
  } catch (error) {
    return next(error);
  }
};

// Verify certificate by certificate number (public endpoint)
export const verifyCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const certificateNumber = req.params.certificateNumber;
    if (!certificateNumber) {
      return res.status(400).json({ error: 'Certificate number is required' });
    }

    const certificate = await certificateModel.getCertificateByNumber(certificateNumber);
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found', valid: false });
    }

    return res.json({
      valid: true,
      certificate: {
        certificate_number: certificate.certificate_number,
        student_name: `${certificate.student_first_name} ${certificate.student_last_name}`,
        course_title: certificate.course_title,
        issued_at: certificate.issued_at,
        completed_at: certificate.completed_at
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Generate certificate for a student (admin/instructor only)
export const generateCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { student_id, course_id, completed_at } = req.body;

    if (!student_id || !course_id) {
      return res.status(400).json({ error: 'Student ID and course ID are required' });
    }

    // Check if certificate already exists
    const existing = await certificateModel.hasCertificate(student_id, course_id);
    if (existing) {
      return res.status(400).json({ error: 'Certificate already exists for this student and course' });
    }

    const completedDate = completed_at ? new Date(completed_at) : new Date();
    const certificate = await certificateModel.createCertificate(student_id, course_id, completedDate);

    const certificateWithDetails = await certificateModel.getCertificateById(certificate.id);
    return res.status(201).json({ certificate: certificateWithDetails });
  } catch (error) {
    return next(error);
  }
};

// Delete certificate (admin only)
export const deleteCertificate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const certificateId = Number(req.params.id);
    if (!Number.isFinite(certificateId)) {
      return res.status(400).json({ error: 'Invalid certificate ID' });
    }

    const deleted = await certificateModel.deleteCertificate(certificateId);
    if (!deleted) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    return res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
