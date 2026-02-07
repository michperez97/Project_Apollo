import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

const isCloudinaryConfigured = (): boolean =>
  Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);

const isPlaceholderValue = (value: string | undefined): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('your_cloudinary_');
};

const assertCloudinaryConfigured = (): void => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured on the server');
  }

  if (
    isPlaceholderValue(CLOUDINARY_CLOUD_NAME) ||
    isPlaceholderValue(CLOUDINARY_API_KEY) ||
    isPlaceholderValue(CLOUDINARY_API_SECRET)
  ) {
    throw new Error('Cloudinary credentials are still set to placeholder values');
  }
};

const normalizeFolder = (folder?: string): string | undefined => {
  if (!folder) return undefined;
  const trimmed = folder.trim();
  if (!trimmed) return undefined;

  // Allow simple nested folder paths like "course-thumbnails" or "instructor/profile".
  if (!/^[A-Za-z0-9/_-]+$/.test(trimmed)) {
    throw new Error('Invalid upload folder');
  }

  return trimmed;
};

export const generateUploadSignature = (folder?: string) => {
  assertCloudinaryConfigured();

  const timestamp = Math.floor(Date.now() / 1000);
  const normalizedFolder = normalizeFolder(folder);
  const paramsToSign: Record<string, string | number> = { timestamp };
  if (normalizedFolder) paramsToSign.folder = normalizedFolder;

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    CLOUDINARY_API_SECRET || ''
  );

  return {
    timestamp,
    signature,
    folder: normalizedFolder,
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY
  };
};
