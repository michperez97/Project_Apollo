import { api } from './http';
import { InboxConversationSummary, InboxMessage, InboxUserSummary } from '../types';

export const getInboxConversations = async (limit = 50): Promise<InboxConversationSummary[]> => {
  const { data } = await api.get<{ conversations: InboxConversationSummary[] }>('/inbox/conversations', {
    params: { limit }
  });
  return data.conversations;
};

export const getInboxRecipients = async (): Promise<InboxUserSummary[]> => {
  const { data } = await api.get<{ recipients: InboxUserSummary[] }>('/inbox/recipients');
  return data.recipients;
};

export const getConversationMessages = async (
  conversationId: number,
  limit = 120
): Promise<InboxMessage[]> => {
  const { data } = await api.get<{ messages: InboxMessage[] }>(
    `/inbox/conversations/${conversationId}/messages`,
    { params: { limit } }
  );
  return data.messages;
};

export const markConversationRead = async (conversationId: number): Promise<void> => {
  await api.post(`/inbox/conversations/${conversationId}/read`);
};

export const sendMessage = async (
  conversationId: number,
  body: string
): Promise<InboxMessage> => {
  const { data } = await api.post<{ message: InboxMessage }>(
    `/inbox/conversations/${conversationId}/messages`,
    { body }
  );
  return data.message;
};

export const createConversation = async (payload: {
  recipient_id: number;
  course_id?: number | null;
  subject?: string | null;
  body: string;
}): Promise<{ conversation_id: number }> => {
  const { data } = await api.post<{ conversation_id: number }>('/inbox/conversations', payload);
  return data;
};

