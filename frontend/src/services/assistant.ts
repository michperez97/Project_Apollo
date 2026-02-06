import { api } from './http';
import { Course } from '../types';

export interface AssistantChatResponse {
  reply: string;
  courses: Course[];
  topic: string;
}

export const sendAssistantMessage = async (message: string): Promise<AssistantChatResponse> => {
  const { data } = await api.post<AssistantChatResponse>('/assistant/chat', { message });
  return data;
};
