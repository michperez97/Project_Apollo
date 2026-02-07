import { api } from './http';

type SignResponse = {
  timestamp: number;
  signature: string;
  folder?: string;
  cloudName?: string;
  apiKey?: string;
};

const normalizeFolder = (folder?: string): string | undefined => {
  if (!folder) return undefined;
  const trimmed = folder.trim();
  return trimmed.length ? trimmed : undefined;
};

const extractApiErrorMessage = (error: unknown): string | null => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;
    if (typeof data === 'object' && data !== null && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return null;
};

export const getSignature = async (folder?: string): Promise<SignResponse> => {
  const normalizedFolder = normalizeFolder(folder);
  const { data } = await api.get<SignResponse>('/uploads/sign', {
    params: normalizedFolder ? { folder: normalizedFolder } : undefined
  });
  return data;
};

export const uploadFile = async (file: File, folder?: string): Promise<string> => {
  const normalizedFolder = normalizeFolder(folder);

  let cloudName: string | undefined;
  let apiKey: string | undefined;
  let timestamp: number;
  let signature: string;
  try {
    const signed = await getSignature(normalizedFolder);
    cloudName = signed.cloudName;
    apiKey = signed.apiKey;
    timestamp = signed.timestamp;
    signature = signed.signature;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error) ?? 'Could not start file upload');
  }

  if (!cloudName || !apiKey) {
    throw new Error('Cloudinary is not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  if (normalizedFolder) formData.append('folder', normalizedFolder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
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
    throw new Error(message);
  }

  const json = (await response.json()) as { secure_url?: unknown };
  if (typeof json.secure_url !== 'string' || !json.secure_url.trim()) {
    throw new Error('Upload failed: missing secure URL');
  }

  return json.secure_url;
};
