import { api, getApiBaseUrl } from './http';

type SignResponse = {
  timestamp: number;
  signature: string;
  folder?: string;
  cloudName?: string;
  apiKey?: string;
};

export const getSignature = async (folder?: string): Promise<SignResponse> => {
  const { data } = await api.get<SignResponse>('/uploads/sign', {
    params: folder ? { folder } : undefined
  });
  return data;
};

export const uploadFile = async (file: File, folder?: string): Promise<string> => {
  const { cloudName, apiKey, timestamp, signature } = await getSignature(folder);
  if (!cloudName || !apiKey) {
    throw new Error('Cloudinary is not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  if (folder) formData.append('folder', folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const json = await response.json();
  return json.secure_url as string;
};


