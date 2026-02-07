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
