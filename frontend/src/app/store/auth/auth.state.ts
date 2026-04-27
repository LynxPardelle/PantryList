import { AuthUser, SessionStatus } from '../../shared/models/auth.model';

export interface AuthState {
  sessionStatus: SessionStatus;
  currentUser: AuthUser | null;
  bootstrapPending: boolean;
  loginPending: boolean;
  refreshPending: boolean;
  authError: string | null;
  infoMessage: string | null;
}

export const initialAuthState: AuthState = {
  sessionStatus: 'unknown',
  currentUser: null,
  bootstrapPending: false,
  loginPending: false,
  refreshPending: false,
  authError: null,
  infoMessage: null,
};
