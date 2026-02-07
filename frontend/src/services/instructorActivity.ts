import { api } from './http';
import { InstructorActivityEvent } from '../types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const clampLimit = (value: number): number => {
  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_LIMIT);
};

export const getInstructorActivityFeed = async (limit = 20): Promise<InstructorActivityEvent[]> => {
  const safeLimit = clampLimit(limit);
  const { data } = await api.get<{ activity: InstructorActivityEvent[] }>('/instructor/activity-feed', {
    params: { limit: safeLimit }
  });

  return data.activity;
};
