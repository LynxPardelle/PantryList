export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  status: 'active' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiAuthUser {
  id: string;
  email: string;
  username: string;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ClaimImportedAccountRequest {
  legacyUsername: string;
  email: string;
  password: string;
  finalUsername?: string;
}
