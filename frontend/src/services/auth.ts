import { api } from './http';
import { AuthResponse } from '../types';

export const register = async (payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/register', payload);
  return data;
};

export const login = async (payload: { email: string; password: string }): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
};

export const fetchProfile = async () => {
  const { data } = await api.get<{ user: AuthResponse['user'] }>('/auth/me');
  return data.user;
};

