import { Request } from 'express';
import { UserRole, SafeUser } from './user';

export interface AuthPayload {
  sub: number;
  email: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & {
  user?: AuthPayload;
};

export interface AuthResponse {
  user: SafeUser;
  token: string;
}


