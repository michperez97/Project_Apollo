import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { findUserById } from '../models/userModel';
import {
  canInstructorMessageStudent,
  canInstructorMessageStudentInCourse,
  canStudentMessageInstructor,
  createDirectConversationWithMessage,
  findExistingDirectConversation,
  isUserConversationParticipant,
  listConversationsForUser,
  listMessageableInstructorsForStudent,
  listMessageableStudentsForInstructor,
  listMessagesForConversation,
  markConversationRead,
  sendConversationMessage
} from '../models/inboxModel';

const MAX_SUBJECT_LENGTH = 120;
const MAX_BODY_LENGTH = 5000;

const parsePositiveInt = (value: unknown): number | null => {
  if (Array.isArray(value)) return null;
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizeText = (value: unknown, maxLen: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

export const listInboxConversationsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const conversations = await listConversationsForUser(req.user.sub, rawLimit ?? 50);
    return res.json({ conversations });
  } catch (error) {
    return next(error);
  }
};

export const listInboxRecipientsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      const recipients = await listMessageableStudentsForInstructor(req.user.sub);
      return res.json({ recipients });
    }

    const recipients = await listMessageableInstructorsForStudent(req.user.sub);
    return res.json({ recipients });
  } catch (error) {
    return next(error);
  }
};

export const listInboxConversationMessagesHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'Invalid conversationId' });

    const allowed = await isUserConversationParticipant(conversationId, req.user.sub);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const rawLimit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const messages = await listMessagesForConversation(conversationId, rawLimit ?? 120);
    return res.json({ messages });
  } catch (error) {
    return next(error);
  }
};

export const markInboxConversationReadHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'Invalid conversationId' });

    const allowed = await isUserConversationParticipant(conversationId, req.user.sub);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    await markConversationRead(conversationId, req.user.sub);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

export const sendInboxMessageHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const conversationId = parsePositiveInt(req.params.conversationId);
    if (!conversationId) return res.status(400).json({ error: 'Invalid conversationId' });

    const body = normalizeText(req.body?.body, MAX_BODY_LENGTH);
    if (!body) return res.status(400).json({ error: 'Message body is required' });

    const allowed = await isUserConversationParticipant(conversationId, req.user.sub);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const message = await sendConversationMessage(conversationId, req.user.sub, body);
    return res.status(201).json({ message });
  } catch (error) {
    return next(error);
  }
};

export const createInboxConversationHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const recipientId = parsePositiveInt(req.body?.recipient_id);
    if (!recipientId) return res.status(400).json({ error: 'recipient_id is required' });
    if (recipientId === req.user.sub) return res.status(400).json({ error: 'Cannot message yourself' });

    const courseId = req.body?.course_id === null || req.body?.course_id === undefined
      ? null
      : parsePositiveInt(req.body?.course_id);
    if (req.body?.course_id !== null && req.body?.course_id !== undefined && !courseId) {
      return res.status(400).json({ error: 'Invalid course_id' });
    }

    const subject = normalizeText(req.body?.subject, MAX_SUBJECT_LENGTH);
    const body = normalizeText(req.body?.body, MAX_BODY_LENGTH);
    if (!body) return res.status(400).json({ error: 'Message body is required' });

    const recipient = await findUserById(recipientId);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    // Enforce instructor <-> student relationship unless admin.
    if (req.user.role !== 'admin') {
      if (req.user.role === 'instructor') {
        if (recipient.role !== 'student') {
          return res.status(400).json({ error: 'Instructors can only message students' });
        }

        const allowed = courseId
          ? await canInstructorMessageStudentInCourse(req.user.sub, recipientId, courseId)
          : await canInstructorMessageStudent(req.user.sub, recipientId);
        if (!allowed) {
          return res.status(403).json({ error: 'Student is not enrolled in your courses' });
        }
      } else if (req.user.role === 'student') {
        if (recipient.role !== 'instructor') {
          return res.status(400).json({ error: 'Students can only message instructors' });
        }

        const allowed = await canStudentMessageInstructor(req.user.sub, recipientId);
        if (!allowed) {
          return res.status(403).json({ error: 'Instructor is not associated with your courses' });
        }
      }
    }

    const existingId = await findExistingDirectConversation({
      userAId: req.user.sub,
      userBId: recipientId,
      courseId
    });

    const conversationId = existingId
      ? existingId
      : await createDirectConversationWithMessage({
          courseId,
          subject,
          userAId: req.user.sub,
          userBId: recipientId,
          senderId: req.user.sub,
          body
        });

    if (existingId) {
      await sendConversationMessage(existingId, req.user.sub, body);
    }

    return res.status(201).json({ conversation_id: conversationId });
  } catch (error) {
    return next(error);
  }
};

