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
  ScormAttemptStatus,
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

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

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

const sanitizeAssetPath = (assetPath: string): string => {
  const normalized = assetPath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .trim();
  const safe = path.posix.normalize(normalized).replace(/^(\.\.\/)+/, '');
  if (!safe || safe.startsWith('..') || path.posix.isAbsolute(safe)) {
    throw new Error('Invalid asset path');
  }
  return safe;
};

const securePathInsideRoot = (root: string, relativePath: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, ...relativePath.split('/'));
  if (resolvedTarget === resolvedRoot) {
    return resolvedTarget;
  }
  if (!resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Invalid path');
  }
  return resolvedTarget;
};

const safeStateValue = (input: unknown): string => {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) {
      return '';
    }
    return String(input);
  }
  return input;
};

const normalizeRuntimeState = (input: unknown): Record<string, string> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!key || key.length > 255) {
      continue;
    }
    normalized[key] = safeStateValue(value).slice(0, 20000);
  }
  return normalized;
};

const normalizeStatusValue = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const parseScormDurationSeconds = (rawValue: string | null): number | null => {
  if (!rawValue) {
    return null;
  }

  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const hhmmssMatch = /^(\d{1,4}):([0-5]?\d):([0-5]?\d)(?:\.(\d+))?$/.exec(value);
  if (hhmmssMatch) {
    const hours = Number(hhmmssMatch[1]);
    const minutes = Number(hhmmssMatch[2]);
    const seconds = Number(hhmmssMatch[3]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  const isoMatch =
    /^P(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)$/i.exec(value);
  if (isoMatch) {
    const hours = Number(isoMatch[1] ?? 0);
    const minutes = Number(isoMatch[2] ?? 0);
    const seconds = Number(isoMatch[3] ?? 0);
    return Math.round(hours * 3600 + minutes * 60 + seconds);
  }

  return null;
};

const parseScore = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

const deriveAttemptStatus = (
  runtimeState: Record<string, string>,
  fallbackStatus: ScormAttemptStatus
): {
  status: ScormAttemptStatus;
  completionStatus: string | null;
  successStatus: string | null;
  lessonLocation: string | null;
  suspendData: string | null;
  scoreRaw: number | null;
  totalTimeSeconds: number | null;
} => {
  const lessonStatus = normalizeStatusValue(runtimeState['cmi.core.lesson_status']);
  const completionStatus =
    normalizeStatusValue(runtimeState['cmi.completion_status']) ??
    (lessonStatus === 'completed' || lessonStatus === 'passed'
      ? 'completed'
      : lessonStatus === 'incomplete' || lessonStatus === 'browsed'
        ? 'incomplete'
        : null);

  const successStatus =
    normalizeStatusValue(runtimeState['cmi.success_status']) ??
    (lessonStatus === 'passed' ? 'passed' : lessonStatus === 'failed' ? 'failed' : null);

  let status: ScormAttemptStatus = fallbackStatus;
  if (successStatus === 'failed' || lessonStatus === 'failed') {
    status = 'failed';
  } else if (successStatus === 'passed' || lessonStatus === 'passed') {
    status = 'passed';
  } else if (completionStatus === 'completed' || lessonStatus === 'completed') {
    status = 'completed';
  } else {
    status = 'in_progress';
  }

  const scoreRaw = parseScore(runtimeState['cmi.score.raw'] ?? runtimeState['cmi.core.score.raw']);
  const totalTimeSeconds = parseScormDurationSeconds(
    runtimeState['cmi.total_time'] ?? runtimeState['cmi.core.total_time'] ?? null
  );
  const lessonLocation =
    runtimeState['cmi.location'] ?? runtimeState['cmi.core.lesson_location'] ?? null;
  const suspendData = runtimeState['cmi.suspend_data'] ?? null;

  return {
    status,
    completionStatus,
    successStatus,
    lessonLocation,
    suspendData,
    scoreRaw,
    totalTimeSeconds
  };
};

const isCompletedStatus = (status: ScormAttemptStatus): boolean =>
  status === 'completed' || status === 'passed';

const serializeLaunchHtml = (input: {
  attemptId: number;
  token: string;
  launchAssetPath: string;
  packageTitle: string;
  runtimeState: Record<string, string>;
}) => {
  const safeTitle = input.packageTitle
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const runtimeEndpoint = JSON.stringify(`/api/scorm/runtime/${input.token}/${input.attemptId}/state`);
  const launchSrc = JSON.stringify(input.launchAssetPath);
  const runtimeState = JSON.stringify(input.runtimeState);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #09090b;
      color: #e4e4e7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }
    .frame-wrap {
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    .frame-wrap iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
  </style>
</head>
<body>
  <div class="frame-wrap">
    <iframe id="scoFrame" title="SCORM Launch" src=${launchSrc} allowfullscreen></iframe>
  </div>
  <script>
    (function () {
      var runtimeEndpoint = ${runtimeEndpoint};
      var runtimeState = Object.assign({}, ${runtimeState});
      var initialized = false;
      var terminated = false;
      var dirty = false;
      var lastError = "0";
      var commitInFlight = null;

      function ok() {
        lastError = "0";
        return "true";
      }

      function fail(code) {
        lastError = String(code);
        return "false";
      }

      function queueCommit() {
        if (!initialized) {
          return;
        }
        if (!dirty && commitInFlight) {
          return;
        }
        if (commitInFlight) {
          return;
        }
        var payload = JSON.stringify({ runtimeState: runtimeState });
        dirty = false;
        commitInFlight = fetch(runtimeEndpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true
        }).catch(function () {
          dirty = true;
        }).finally(function () {
          commitInFlight = null;
        });
      }

      function getValue(element) {
        if (!Object.prototype.hasOwnProperty.call(runtimeState, element)) {
          return "";
        }
        var value = runtimeState[element];
        return typeof value === "string" ? value : String(value ?? "");
      }

      var API = {
        LMSInitialize: function () {
          if (initialized) return fail(101);
          initialized = true;
          terminated = false;
          return ok();
        },
        LMSFinish: function () {
          if (!initialized) return fail(301);
          if (terminated) return fail(101);
          terminated = true;
          queueCommit();
          return ok();
        },
        LMSGetValue: function (element) {
          if (!initialized) return "";
          lastError = "0";
          return getValue(String(element || ""));
        },
        LMSSetValue: function (element, value) {
          if (!initialized) return fail(301);
          if (terminated) return fail(101);
          runtimeState[String(element || "")] = value == null ? "" : String(value);
          dirty = true;
          lastError = "0";
          return "true";
        },
        LMSCommit: function () {
          if (!initialized) return fail(301);
          queueCommit();
          return ok();
        },
        LMSGetLastError: function () {
          return String(lastError);
        },
        LMSGetErrorString: function (code) {
          return String(code || lastError);
        },
        LMSGetDiagnostic: function (code) {
          return String(code || lastError);
        }
      };

      var API_1484_11 = {
        Initialize: function () { return API.LMSInitialize(""); },
        Terminate: function () { return API.LMSFinish(""); },
        GetValue: function (element) { return API.LMSGetValue(element); },
        SetValue: function (element, value) { return API.LMSSetValue(element, value); },
        Commit: function () { return API.LMSCommit(""); },
        GetLastError: function () { return API.LMSGetLastError(); },
        GetErrorString: function (code) { return API.LMSGetErrorString(code); },
        GetDiagnostic: function (code) { return API.LMSGetDiagnostic(code); }
      };

      window.API = API;
      window.API_1484_11 = API_1484_11;

      window.addEventListener("beforeunload", function () {
        try {
          if (initialized) {
            API.LMSFinish("");
          }
        } catch (error) {
          // no-op
        }
      });
    })();
  </script>
</body>
</html>`;
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
