import { api } from './http';
import { InstructorProfile, Course } from '../types';

export const getMyProfile = async (): Promise<InstructorProfile> => {
  const { data } = await api.get<{ profile: InstructorProfile }>('/profiles/me');
  return data.profile;
};

export const updateMyProfile = async (
  payload: Partial<Omit<InstructorProfile, 'id' | 'user_id' | 'first_name' | 'last_name' | 'email' | 'created_at' | 'updated_at'>>
): Promise<InstructorProfile> => {
  const { data } = await api.put<{ profile: InstructorProfile }>('/profiles/me', payload);
  return data.profile;
};

export const getPublicProfile = async (userId: number): Promise<{ profile: InstructorProfile; courses: Course[] }> => {
  const { data } = await api.get<{ profile: InstructorProfile; courses: Course[] }>(`/profiles/${userId}`);
  return data;
};
