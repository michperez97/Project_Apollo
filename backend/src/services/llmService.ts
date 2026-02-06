import axios from 'axios';

export type LlmRole = 'system' | 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
}

const provider = (process.env.LLM_PROVIDER ?? 'openai_compatible').toLowerCase();
const baseUrl = process.env.LLM_BASE_URL ?? 'http://localhost:11434/v1';
const apiKey = process.env.LLM_API_KEY;
const model = process.env.LLM_MODEL;
const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 12000);

const joinUrl = (root: string, path: string) => {
  const trimmedRoot = root.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');
  return `${trimmedRoot}/${trimmedPath}`;
};

export const generateChatCompletion = async (
  messages: LlmMessage[],
  options: LlmChatOptions = {}
): Promise<string | null> => {
  if (provider === 'disabled') {
    return null;
  }

  if (provider !== 'openai_compatible') {
    console.warn(`Unsupported LLM_PROVIDER "${provider}". Falling back to offline response.`);
    return null;
  }

  if (!model) {
    console.warn('LLM_MODEL is not set; falling back to offline response.');
    return null;
  }

  const url = joinUrl(baseUrl, 'chat/completions');
  const payload = {
    model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 400
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const response = await axios.post(url, payload, { headers, timeout: timeoutMs });
    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
    return null;
  } catch (error) {
    console.error('LLM request failed:', error);
    return null;
  }
};
