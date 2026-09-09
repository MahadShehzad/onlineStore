import { Role, User } from './user.model';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Extract<Role, 'Customer' | 'Vendor'>;
  storeName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: User;
}

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };
