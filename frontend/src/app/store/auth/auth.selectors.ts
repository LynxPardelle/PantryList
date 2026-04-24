import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.state';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectSessionStatus = createSelector(
  selectAuthState,
  (state) => state.sessionStatus,
);

export const selectCurrentUser = createSelector(
  selectAuthState,
  (state) => state.currentUser,
);

export const selectCurrentUsername = createSelector(
  selectCurrentUser,
  (user) => user?.username ?? null,
);

export const selectAuthenticatedUsername = selectCurrentUsername;

export const selectBootstrapPending = createSelector(
  selectAuthState,
  (state) => state.bootstrapPending,
);

export const selectLoginPending = createSelector(
  selectAuthState,
  (state) => state.loginPending,
);

export const selectRegisterPending = createSelector(
  selectAuthState,
  (state) => state.registerPending,
);

export const selectRefreshPending = createSelector(
  selectAuthState,
  (state) => state.refreshPending,
);

export const selectClaimPending = createSelector(
  selectAuthState,
  (state) => state.claimPending,
);

export const selectPasswordRecoveryPending = createSelector(
  selectAuthState,
  (state) => state.passwordRecoveryPending,
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state) => state.authError,
);

export const selectAuthInfoMessage = createSelector(
  selectAuthState,
  (state) => state.infoMessage,
);

export const selectAuthMessage = selectAuthInfoMessage;

export const selectIsAuthenticated = createSelector(
  selectSessionStatus,
  (status) => status === 'authenticated',
);

export const selectAuthSessionStatus = selectSessionStatus;
