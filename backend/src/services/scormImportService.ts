import axios from 'axios';
import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import pool from '../config/database';
import { CourseRecord } from '../models/courseModel';
import { CourseLessonRecord } from '../models/courseLessonModel';
import { CourseSectionRecord } from '../models/courseSectionModel';
import { ScormPackageRecord } from '../models/scormPackageModel';

const execFileAsync = promisify(execFile);

const SCORM_STORAGE_ROOT = path.resolve(
  process.env.SCORM_STORAGE_ROOT || path.join(process.cwd(), 'storage', 'scorm')
);

const MAX_SCORM_PACKAGE_BYTES = 300 * 1024 * 1024;

const deriveTitleFromFileName = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    return `SCORM Import ${new Date().toISOString().slice(0, 10)}`;
  }
  return cleaned;
};

const toPosixPath = (value: string): string => value.split(path.sep).join('/');

const ensureInsideRoot = (root: string, target: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget === resolvedRoot) {
    return resolvedTarget;
  }
  if (!resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error('Invalid package path');
  }
  return resolvedTarget;
};

const findFileRecursive = async (
  rootDir: string,
  fileNameLowerCase: string
): Promise<string | null> => {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name.toLowerCase() === fileNameLowerCase) {
      return absPath;
    }
    if (entry.isDirectory()) {
      const nested = await findFileRecursive(absPath, fileNameLowerCase);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
};

const parseXmlAttributes = (raw: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  const regex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null = regex.exec(raw);
  while (match) {
    attributes[match[1]] = match[2] ?? match[3] ?? '';
    match = regex.exec(raw);
  }
  return attributes;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface ParsedManifest {
  title: string | null;
  launchPath: string;
  manifestPath: string;
  manifestIdentifier: string | null;
  version: '1.2' | '2004';
}

const parseManifest = (manifestXml: string, manifestPath: string): ParsedManifest => {
  const manifestTagMatch = manifestXml.match(/<manifest\b([^>]*)>/i);
  const manifestAttributes = parseXmlAttributes(manifestTagMatch?.[1] ?? '');
  const manifestIdentifier = manifestAttributes.identifier ?? null;

  const version: '1.2' | '2004' =
    /adlcp_v1p3|adlseq_v1p3|imsss_v1p0|2004/i.test(manifestXml) ? '2004' : '1.2';

  const organizationsMatch = manifestXml.match(/<organizations\b([^>]*)>/i);
  const organizationsAttributes = parseXmlAttributes(organizationsMatch?.[1] ?? '');
  const defaultOrganization = organizationsAttributes.default;

  let organizationBlock = manifestXml;
  if (defaultOrganization) {
    const orgRegex = new RegExp(
      `<organization\\b[^>]*identifier=(\"|')${escapeRegExp(defaultOrganization)}\\1[^>]*>([\\s\\S]*?)<\\/organization>`,
      'i'
    );
    const orgMatch = orgRegex.exec(manifestXml);
    if (orgMatch?.[2]) {
      organizationBlock = orgMatch[2];
    }
  }

  const titleMatch = organizationBlock.match(/<title>([^<]+)<\/title>/i);
  const organizationTitle = titleMatch?.[1]?.trim() || null;

  const firstItemMatch = organizationBlock.match(/<item\b([^>]*)>/i);
  const firstItemAttributes = parseXmlAttributes(firstItemMatch?.[1] ?? '');
  const targetIdentifierRef = firstItemAttributes.identifierref ?? null;

  type ResourceEntry = { href: string | null; fileHref: string | null };
  const resources = new Map<string, ResourceEntry>();
  const resourceRegex =
    /<resource\b([^>]*)>([\s\S]*?)<\/resource>|<resource\b([^>]*)\/>/gi;
  let resourceMatch = resourceRegex.exec(manifestXml);
  while (resourceMatch) {
    const rawAttributes = resourceMatch[1] ?? resourceMatch[3] ?? '';
    const resourceAttributes = parseXmlAttributes(rawAttributes);
    const identifier = resourceAttributes.identifier;
    if (identifier) {
      const href = resourceAttributes.href ?? null;
      const fileHrefMatch = (resourceMatch[2] ?? '').match(
        /<file\b[^>]*href=(?:"([^"]*)"|'([^']*)')[^>]*\/?>/i
      );
      const fileHref = fileHrefMatch?.[1] ?? fileHrefMatch?.[2] ?? null;
      resources.set(identifier, { href, fileHref });
    }
    resourceMatch = resourceRegex.exec(manifestXml);
  }

  const fallbackResource = resources.values().next().value as ResourceEntry | undefined;
  const resource = targetIdentifierRef ? resources.get(targetIdentifierRef) : fallbackResource;
  const href = resource?.href ?? resource?.fileHref;

  if (!href) {
    throw new Error('SCORM manifest does not contain a launch href');
  }

  const manifestDir = path.posix.dirname(manifestPath);
  const relativeRoot = manifestDir === '.' ? '' : manifestDir;
  const normalizedHref = href.replace(/\\/g, '/').trim();
  const launchPath = path.posix
    .normalize(path.posix.join(relativeRoot, normalizedHref))
    .replace(/^\.\/+/, '');

  if (!launchPath || launchPath.startsWith('..') || path.posix.isAbsolute(launchPath)) {
    throw new Error('Invalid launch path in SCORM manifest');
  }

  return {
    title: organizationTitle,
    launchPath,
    manifestPath,
    manifestIdentifier,
    version
  };
};

const removeDirectoryQuietly = async (directoryPath: string): Promise<void> => {
  await fs.rm(directoryPath, { recursive: true, force: true }).catch(() => undefined);
};

const downloadPackage = async (packageUrl: string, outputPath: string): Promise<void> => {
  const response = await axios.get<ArrayBuffer>(packageUrl, {
    responseType: 'arraybuffer',
    maxContentLength: MAX_SCORM_PACKAGE_BYTES,
    maxBodyLength: MAX_SCORM_PACKAGE_BYTES,
    timeout: 30000
  });

  const data = Buffer.from(response.data);
  if (!data.length) {
    throw new Error('Downloaded SCORM package is empty');
  }
  if (data.length > MAX_SCORM_PACKAGE_BYTES) {
    throw new Error('SCORM package exceeds maximum supported size');
  }

  await fs.writeFile(outputPath, data);
};

const extractPackage = async (zipPath: string, outputDirectory: string): Promise<void> => {
  try {
    await execFileAsync('unzip', ['-qq', '-o', zipPath, '-d', outputDirectory]);
  } catch (error) {
    if (error instanceof Error && /ENOENT/.test(error.message)) {
      throw new Error('SCORM extractor is not available on the server (missing unzip)');
    }
    throw new Error('Failed to extract SCORM package archive');
  }
};

export interface ImportScormPackageInput {
  instructorId: number;
  packageUrl: string;
  fileName: string;
  courseTitle?: string;
  courseDescription?: string;
  coursePrice?: number;
}

export interface ImportScormPackageResult {
  course: CourseRecord;
  section: CourseSectionRecord;
  lesson: CourseLessonRecord;
  scormPackage: ScormPackageRecord;
}

export const importScormPackageToDraftCourse = async (
  input: ImportScormPackageInput
): Promise<ImportScormPackageResult> => {
  const importId = randomUUID();
  const importRoot = path.join(SCORM_STORAGE_ROOT, importId);
  const extractionRoot = path.join(importRoot, 'content');
  const zipPath = path.join(importRoot, 'package.zip');

  await fs.mkdir(extractionRoot, { recursive: true });

  try {
    await downloadPackage(input.packageUrl, zipPath);
    await extractPackage(zipPath, extractionRoot);
    await fs.unlink(zipPath).catch(() => undefined);

    const manifestAbsolute = await findFileRecursive(extractionRoot, 'imsmanifest.xml');
    if (!manifestAbsolute) {
      throw new Error('SCORM package is missing imsmanifest.xml');
    }

    const validatedManifestAbsolute = ensureInsideRoot(extractionRoot, manifestAbsolute);
    const manifestRelative = toPosixPath(path.relative(extractionRoot, validatedManifestAbsolute));
    const manifestXml = await fs.readFile(validatedManifestAbsolute, 'utf8');
    const parsedManifest = parseManifest(manifestXml, manifestRelative);

    const launchAbsolute = ensureInsideRoot(
      extractionRoot,
      path.join(extractionRoot, ...parsedManifest.launchPath.split('/'))
    );
    await fs.access(launchAbsolute);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const courseResult = await client.query<CourseRecord>(
        `INSERT INTO courses (title, description, category, price, thumbnail_url, status, instructor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          (input.courseTitle && input.courseTitle.trim()) ||
            parsedManifest.title ||
            deriveTitleFromFileName(input.fileName),
          input.courseDescription?.trim() || 'Imported from SCORM package.',
          'SCORM',
          input.coursePrice ?? 0,
          null,
          'draft',
          input.instructorId
        ]
      );
      const course = courseResult.rows[0];

      const sectionResult = await client.query<CourseSectionRecord>(
        `INSERT INTO course_sections (course_id, title, position)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [course.id, 'SCORM Package', 0]
      );
      const section = sectionResult.rows[0];

      const lessonResult = await client.query<CourseLessonRecord>(
        `INSERT INTO course_lessons (
          course_id,
          section_id,
          title,
          lesson_type,
          position,
          video_url,
          content,
          duration_seconds,
          is_preview
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          course.id,
          section.id,
          parsedManifest.title || 'SCORM Lesson',
          'scorm',
          0,
          null,
          null,
          null,
          false
        ]
      );
      const lesson = lessonResult.rows[0];

      const scormPackageResult = await client.query<ScormPackageRecord>(
        `INSERT INTO scorm_packages (
          course_id,
          section_id,
          lesson_id,
          title,
          package_url,
          storage_path,
          manifest_path,
          launch_path,
          scorm_version,
          manifest_identifier,
          created_by
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          course.id,
          section.id,
          lesson.id,
          parsedManifest.title || deriveTitleFromFileName(input.fileName),
          input.packageUrl,
          extractionRoot,
          parsedManifest.manifestPath,
          parsedManifest.launchPath,
          parsedManifest.version,
          parsedManifest.manifestIdentifier,
          input.instructorId
        ]
      );
      const scormPackage = scormPackageResult.rows[0];

      const lessonContent = JSON.stringify({
        scorm_package_id: scormPackage.id,
        launch_path: parsedManifest.launchPath,
        version: parsedManifest.version
      });

      const finalizedLessonResult = await client.query<CourseLessonRecord>(
        `UPDATE course_lessons
         SET content = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [lessonContent, lesson.id]
      );
      const finalizedLesson = finalizedLessonResult.rows[0];

      await client.query('COMMIT');

      return {
        course,
        section,
        lesson: finalizedLesson,
        scormPackage
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await removeDirectoryQuietly(importRoot);
    throw error;
  }
};
