import path from 'path';
import { ScormAttemptStatus } from '../models/scormAttemptModel';

export const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const sanitizeAssetPath = (assetPath: string): string => {
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

export const securePathInsideRoot = (root: string, relativePath: string): string => {
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

export const normalizeRuntimeState = (input: unknown): Record<string, string> => {
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

export const deriveAttemptStatus = (
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

export const isCompletedStatus = (status: ScormAttemptStatus): boolean =>
  status === 'completed' || status === 'passed';

export const serializeLaunchHtml = (input: {
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
