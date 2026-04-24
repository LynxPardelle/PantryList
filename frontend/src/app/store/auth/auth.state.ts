import { AuthUser, SessionStatus } from '../../shared/models/auth.model';

export interface AuthState {
  sessionStatus: SessionStatus;
  currentUser: AuthUser | null;
  bootstrapPending: boolean;
  loginPending: boolean;
  registerPending: boolean;
  refreshPending: boolean;
  claimPending: boolean;
  passwordRecoveryPending: boolean;
  authError: string | null;
  infoMessage: string | null;
}

export const initialAuthState: AuthState = {
  sessionStatus: 'unknown',
  currentUser: null,
  bootstrapPending: false,
  loginPending: false,
  registerPending: false,
  refreshPending: false,
  claimPending: false,
  passwordRecoveryPending: false,
  authError: null,
  infoMessage: null,
};
