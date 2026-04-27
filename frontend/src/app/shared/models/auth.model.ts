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
