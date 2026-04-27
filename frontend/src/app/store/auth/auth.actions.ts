import { createAction, props } from '@ngrx/store';
import {
  AuthUser,
  ClaimImportedAccountRequest,
  ForgotPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../../shared/models/auth.model';

export const bootstrapSession = createAction('[Auth] Bootstrap Session');

export const bootstrapSessionSuccess = createAction(
  '[Auth] Bootstrap Session Success',
  props<{ user: AuthUser }>(),
);

export const bootstrapSessionAnonymous = createAction(
  '[Auth] Bootstrap Session Anonymous',
);

export const bootstrapSessionFailure = createAction(
  '[Auth] Bootstrap Session Failure',
  props<{ error: string }>(),
);

export const login = createAction(
  '[Auth] Login',
  props<{ provider?: string | null; redirectTo?: string | null }>(),
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: AuthUser; redirectTo?: string | null }>(),
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>(),
);

export const register = createAction(
  '[Auth] Register',
  props<{ payload: RegisterRequest; redirectTo?: string | null }>(),
);

export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ user: AuthUser; redirectTo?: string | null }>(),
);

export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>(),
);

export const forgotPassword = createAction(
  '[Auth] Forgot Password',
  props<{ payload: ForgotPasswordRequest }>(),
);

export const forgotPasswordSuccess = createAction(
  '[Auth] Forgot Password Success',
  props<{ message: string }>(),
);

export const forgotPasswordFailure = createAction(
  '[Auth] Forgot Password Failure',
  props<{ error: string }>(),
);

export const resetPassword = createAction(
  '[Auth] Reset Password',
  props<{ payload: ResetPasswordRequest }>(),
);

export const resetPasswordSuccess = createAction(
  '[Auth] Reset Password Success',
  props<{ message: string }>(),
);

export const resetPasswordFailure = createAction(
  '[Auth] Reset Password Failure',
  props<{ error: string }>(),
);

export const claimImportedAccount = createAction(
  '[Auth] Claim Imported Account',
  props<{ payload: ClaimImportedAccountRequest; redirectTo?: string | null }>(),
);

export const claimImportedAccountSuccess = createAction(
  '[Auth] Claim Imported Account Success',
  props<{ user: AuthUser; redirectTo?: string | null }>(),
);

export const claimImportedAccountFailure = createAction(
  '[Auth] Claim Imported Account Failure',
  props<{ error: string }>(),
);

export const refreshSession = createAction('[Auth] Refresh Session');

export const refreshSessionSuccess = createAction(
  '[Auth] Refresh Session Success',
  props<{ user: AuthUser }>(),
);

export const refreshSessionFailure = createAction(
  '[Auth] Refresh Session Failure',
  props<{ error: string }>(),
);

export const logout = createAction('[Auth] Logout');

export const logoutSuccess = createAction(
  '[Auth] Logout Success',
  props<{ logoutUrl?: string | null }>(),
);

export const logoutFailure = createAction(
  '[Auth] Logout Failure',
  props<{ error: string }>(),
);

export const sessionExpired = createAction(
  '[Auth] Session Expired',
  props<{ error: string }>(),
);

export const clearFeedback = createAction('[Auth] Clear Feedback');
