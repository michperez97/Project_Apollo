import { api } from './http';
import { Announcement } from '../types';

export const getAnnouncements = async (courseId?: number): Promise<Announcement[]> => {
  const { data } = await api.get<{ announcements: Announcement[] }>('/announcements', {
    params: courseId ? { courseId } : undefined
  });
  return data.announcements;
};

export const createAnnouncement = async (payload: {
  course_id: number;
  title: string;
  message: string;
}): Promise<Announcement> => {
  const { data } = await api.post<{ announcement: Announcement }>('/announcements', payload);
  return data.announcement;
};

export const updateAnnouncement = async (
  id: number,
  updates: { title?: string; message?: string }
): Promise<Announcement> => {
  const { data } = await api.put<{ announcement: Announcement }>(`/announcements/${id}`, updates);
  return data.announcement;
};

export const deleteAnnouncement = async (id: number): Promise<void> => {
  await api.delete(`/announcements/${id}`);
};
