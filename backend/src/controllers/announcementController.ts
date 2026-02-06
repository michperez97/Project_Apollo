import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import {
  createAnnouncement,
  listAnnouncementsByCourse,
  listAllAnnouncements,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement
} from '../models/announcementModel';
import { notifyAnnouncement } from '../services/notificationService';

export const createAnnouncementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return res.status(403).json({ error: 'Only admins and instructors can create announcements' });
    }

    const { course_id, title, message } = req.body;

    if (!course_id || !title || !message) {
      return res.status(400).json({ error: 'course_id, title, and message are required' });
    }

    const announcement = await createAnnouncement({
      course_id: Number(course_id),
      teacher_id: user.sub,
      title,
      message
    });

    await notifyAnnouncement(announcement);
    return res.status(201).json({ announcement });
  } catch (error) {
    return next(error);
  }
};

export const listAnnouncementsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const courseIdQuery = req.query.courseId ? Number(req.query.courseId) : undefined;

    if (courseIdQuery) {
      const announcements = await listAnnouncementsByCourse(courseIdQuery);
      return res.json({ announcements });
    }

    const announcements = await listAllAnnouncements();
    return res.json({ announcements });
  } catch (error) {
    return next(error);
  }
};

export const updateAnnouncementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return res.status(403).json({ error: 'Only admins and instructors can update announcements' });
    }

    const announcementId = Number(req.params.id);
    const { title, message } = req.body;

    const existing = await getAnnouncementById(announcementId);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (user.role === 'instructor' && existing.teacher_id !== user.sub) {
      return res.status(403).json({ error: 'You can only update your own announcements' });
    }

    const announcement = await updateAnnouncement(announcementId, { title, message });
    return res.json({ announcement });
  } catch (error) {
    return next(error);
  }
};

export const deleteAnnouncementHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'admin' && user.role !== 'instructor') {
      return res.status(403).json({ error: 'Only admins and instructors can delete announcements' });
    }

    const announcementId = Number(req.params.id);

    const existing = await getAnnouncementById(announcementId);
    if (!existing) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    if (user.role === 'instructor' && existing.teacher_id !== user.sub) {
      return res.status(403).json({ error: 'You can only delete your own announcements' });
    }

    await deleteAnnouncement(announcementId);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};
