import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth';
import { getLessonById } from '../models/courseLessonModel';
import {
  createScormAttempt,
  getScormAttemptByStudentAndLesson,
  getScormAttemptLaunchContext,
  updateScormAttemptRuntime,
  rotateScormAttemptLaunchToken
} from '../models/scormAttemptModel';
import { getScormPackageWithLessonContextByLessonId } from '../models/scormPackageModel';
import { recordSubscriptionUsage } from '../models/subscriptionUsageModel';
import { upsertProgress } from '../models/studentProgressModel';
import { getStudentCourseAccess } from '../services/courseAccessService';
import {
  importScormPackageToDraftCourse,
  ImportScormPackageResult
} from '../services/scormImportService';
import {
  parsePositiveInt,
  sanitizeAssetPath,
  securePathInsideRoot,
  normalizeRuntimeState,
  deriveAttemptStatus,
  isCompletedStatus,
  serializeLaunchHtml
} from '../services/scormRuntime';

const generateLaunchToken = (): string => randomBytes(32).toString('hex');

const getContextForRuntimeRequest = async (
  attemptIdRaw: unknown,
  tokenRaw: unknown
) => {
  const attemptId = parsePositiveInt(attemptIdRaw);
  const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : '';
  if (!attemptId || !token) {
    return null;
  }
  return getScormAttemptLaunchContext(attemptId, token);
};

export const importScormPackageHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { packageUrl, fileName, title, description, price, instructor_id } = req.body as {
      packageUrl?: string;
      fileName?: string;
      title?: string;
      description?: string;
      price?: number;
      instructor_id?: number;
    };

    if (!packageUrl || typeof packageUrl !== 'string') {
      return res.status(400).json({ error: 'packageUrl is required' });
    }
    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({ error: 'fileName is required' });
    }

    let targetInstructorId = req.user.sub;
    if (req.user.role === 'admin' && instructor_id) {
      const parsedInstructorId = parsePositiveInt(instructor_id);
      if (!parsedInstructorId) {
        return res.status(400).json({ error: 'Invalid instructor_id' });
      }
      targetInstructorId = parsedInstructorId;
    } else if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const imported: ImportScormPackageResult = await importScormPackageToDraftCourse({
      instructorId: targetInstructorId,
      packageUrl,
      fileName,
      courseTitle: typeof title === 'string' ? title : undefined,
      courseDescription: typeof description === 'string' ? description : undefined,
      coursePrice: typeof price === 'number' ? price : undefined
    });

    return res.status(201).json({
      course: imported.course,
      section: imported.section,
      lesson: imported.lesson,
      scormPackage: {
        id: imported.scormPackage.id,
        title: imported.scormPackage.title,
        version: imported.scormPackage.scorm_version,
        launch_path: imported.scormPackage.launch_path
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
};

export const startScormAttemptHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const lessonId = parsePositiveInt(req.params.lessonId);
    if (!lessonId) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }

    const lesson = await getLessonById(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    if (lesson.lesson_type !== 'scorm') {
      return res.status(400).json({ error: 'Lesson is not a SCORM lesson' });
    }

    const scormPackage = await getScormPackageWithLessonContextByLessonId(lessonId);
    if (!scormPackage) {
      return res.status(404).json({ error: 'SCORM package not found for lesson' });
    }

    const access = await getStudentCourseAccess(req.user.sub, lesson.course_id);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'No active access for this course' });
    }

    if (access.source === 'subscription') {
      await recordSubscriptionUsage(req.user.sub, lesson.course_id);
    }

    const launchToken = generateLaunchToken();
    const existingAttempt = await getScormAttemptByStudentAndLesson(req.user.sub, lessonId);
    const attempt = existingAttempt
      ? await rotateScormAttemptLaunchToken(existingAttempt.id, launchToken)
      : await createScormAttempt({
          scorm_package_id: scormPackage.id,
          lesson_id: lessonId,
          student_id: req.user.sub,
          launch_token: launchToken
        });

    if (!attempt) {
      return res.status(500).json({ error: 'Could not initialize SCORM attempt' });
    }

    const progressStatus = isCompletedStatus(attempt.status) ? 'completed' : 'in_progress';
    await upsertProgress({
      student_id: req.user.sub,
      lesson_id: lessonId,
      status: progressStatus
    });

    const launchUrl = `/api/scorm/runtime/${attempt.launch_token}/${attempt.id}/launch`;
    return res.json({
      attemptId: attempt.id,
      launchUrl,
      status: attempt.status
    });
  } catch (error) {
    return next(error);
  }
};

export const getScormRuntimeStateHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const context = await getContextForRuntimeRequest(req.params.attemptId, req.params.token);
    if (!context) {
      return res.status(404).json({ error: 'SCORM attempt not found' });
    }

    return res.json({
      runtimeState: context.runtime_state ?? {},
      status: context.status,
      completion_status: context.completion_status,
      success_status: context.success_status
    });
  } catch (error) {
    return next(error);
  }
};

export const updateScormRuntimeStateHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const context = await getContextForRuntimeRequest(req.params.attemptId, req.params.token);
    if (!context) {
      return res.status(404).json({ error: 'SCORM attempt not found' });
    }

    const runtimeState = normalizeRuntimeState(req.body?.runtimeState);
    const derived = deriveAttemptStatus(runtimeState, context.status);
    const totalTimeSeconds =
      typeof derived.totalTimeSeconds === 'number'
        ? Math.max(context.total_time_seconds, derived.totalTimeSeconds)
        : context.total_time_seconds;

    const completedNow = isCompletedStatus(derived.status);
    const updatedAttempt = await updateScormAttemptRuntime(context.id, {
      runtime_state: runtimeState,
      status: derived.status,
      completion_status: derived.completionStatus,
      success_status: derived.successStatus,
      score_raw: derived.scoreRaw,
      total_time_seconds: totalTimeSeconds,
      lesson_location: derived.lessonLocation,
      suspend_data: derived.suspendData,
      completed_at: completedNow ? new Date() : null
    });

    if (!updatedAttempt) {
      return res.status(404).json({ error: 'SCORM attempt not found' });
    }

    await upsertProgress({
      student_id: context.student_id,
      lesson_id: context.lesson_id,
      status: completedNow ? 'completed' : 'in_progress'
    });

    return res.json({
      status: updatedAttempt.status,
      completion_status: updatedAttempt.completion_status,
      success_status: updatedAttempt.success_status
    });
  } catch (error) {
    return next(error);
  }
};

export const serveScormLaunchHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const context = await getContextForRuntimeRequest(req.params.attemptId, req.params.token);
    if (!context) {
      return res.status(404).send('SCORM launch not found');
    }

    const launchAssetPath = `/api/scorm/runtime/${context.launch_token}/${context.id}/assets/${context.package_launch_path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;

    const html = serializeLaunchHtml({
      attemptId: context.id,
      token: context.launch_token,
      launchAssetPath,
      packageTitle: context.package_title,
      runtimeState: context.runtime_state ?? {}
    });

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return next(error);
  }
};

export const serveScormAssetHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const context = await getContextForRuntimeRequest(req.params.attemptId, req.params.token);
    if (!context) {
      return res.status(404).send('SCORM asset not found');
    }

    const rawAssetPath = req.params[0];
    if (!rawAssetPath) {
      return res.status(404).send('SCORM asset path is required');
    }

    const safeRelativePath = sanitizeAssetPath(rawAssetPath);
    let resolvedAssetPath = securePathInsideRoot(context.package_storage_path, safeRelativePath);

    const stat = await fs.stat(resolvedAssetPath).catch(() => null);
    if (!stat) {
      return res.status(404).send('SCORM asset not found');
    }
    if (stat.isDirectory()) {
      resolvedAssetPath = securePathInsideRoot(
        context.package_storage_path,
        path.posix.join(safeRelativePath, 'index.html')
      );
      await fs.access(resolvedAssetPath).catch(() => {
        throw new Error('SCORM asset not found');
      });
    }

    return res.sendFile(resolvedAssetPath);
  } catch (error) {
    if (error instanceof Error && error.message === 'SCORM asset not found') {
      return res.status(404).send(error.message);
    }
    return next(error);
  }
};
