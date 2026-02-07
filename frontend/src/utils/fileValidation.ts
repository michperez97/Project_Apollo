export const validateImageFile = (
  file: File,
  maxSizeBytes: number,
  fileLabel = 'Image'
): string | null => {
  if (!file.type.startsWith('image/')) {
    return 'Please choose an image file.';
  }

  if (file.size > maxSizeBytes) {
    const maxSizeMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));
    return `${fileLabel} is too large. Maximum size is ${maxSizeMb}MB.`;
  }

  return null;
};

const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts.pop()?.toLowerCase() ?? '';
};

export const validateScormPackageFile = (
  file: File,
  maxSizeBytes: number
): string | null => {
  const extension = getFileExtension(file.name);
  const allowedExtensions = new Set(['zip', 'pif']);
  const isAllowedExtension = allowedExtensions.has(extension);

  const allowedMimeTypes = new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/octet-stream'
  ]);
  const mimeLooksValid = !file.type || allowedMimeTypes.has(file.type);

  if (!isAllowedExtension || !mimeLooksValid) {
    return 'Please choose a SCORM package (.zip or .pif).';
  }

  if (file.size > maxSizeBytes) {
    const maxSizeMb = Math.max(1, Math.round(maxSizeBytes / (1024 * 1024)));
    return `SCORM package is too large. Maximum size is ${maxSizeMb}MB.`;
  }

  return null;
};
