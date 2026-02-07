import { api } from './http';
import { NotificationFeedItem } from '../types';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 25;

const clampLimit = (value: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_LIMIT);
};

export const getNotifications = async (limit = 12): Promise<NotificationFeedItem[]> => {
  const safeLimit = clampLimit(limit);
  const { data } = await api.get<{ notifications: NotificationFeedItem[] }>('/notifications', {
    params: { limit: safeLimit }
  });
  return data.notifications;
};

export const markNotificationsRead = async (notificationIds: string[]): Promise<number> => {
  const cleanedIds = Array.from(
    new Set(
      notificationIds
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );

  if (!cleanedIds.length) {
    return 0;
  }

  const { data } = await api.post<{ success: boolean; updated: number }>('/notifications/read', {
    notificationIds: cleanedIds
  });
  return data.updated;
};
