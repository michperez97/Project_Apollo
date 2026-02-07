const DEFAULT_CLOUD_NAME = 'dmscdsvfq';
const DEFAULT_UPLOAD_PRESET = 'apollo_unsigned';

const CLOUDINARY_CLOUD_NAME =
  (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined)?.trim() ||
  DEFAULT_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET =
  (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined)?.trim() ||
  DEFAULT_UPLOAD_PRESET;
const CLOUDINARY_DEFAULT_FOLDER =
  (import.meta.env.VITE_CLOUDINARY_DEFAULT_FOLDER as string | undefined)?.trim() || undefined;

const normalizeFolder = (folder?: string): string | undefined => {
  if (!folder) return undefined;
  const trimmed = folder.trim();
  return trimmed.length ? trimmed : undefined;
};

export const uploadFile = async (file: File, folder?: string): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary upload is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  const normalizedFolder = normalizeFolder(folder) ?? CLOUDINARY_DEFAULT_FOLDER;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (normalizedFolder) formData.append('folder', normalizedFolder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let message = 'Upload failed';
    try {
      const errorJson = (await response.json()) as { error?: { message?: string } };
      if (errorJson.error?.message) {
        message = errorJson.error.message;
      }
    } catch {
      // Best-effort parsing only.
    }

    if (message.toLowerCase().includes('upload preset')) {
      message = `Cloudinary preset "${CLOUDINARY_UPLOAD_PRESET}" is not ready for unsigned uploads.`;
    }
    throw new Error(message);
  }

  const json = (await response.json()) as { secure_url?: unknown };
  if (typeof json.secure_url !== 'string' || !json.secure_url.trim()) {
    throw new Error('Upload failed: missing secure URL');
  }

  return json.secure_url;
};
