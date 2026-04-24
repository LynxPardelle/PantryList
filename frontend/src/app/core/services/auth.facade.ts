import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../store/auth/auth.actions';
import {
  selectAuthError,
  selectAuthInfoMessage,
  selectBootstrapPending,
  selectClaimPending,
  selectCurrentUser,
  selectCurrentUsername,
  selectRefreshPending,
  selectAuthState,
  selectIsAuthenticated,
  selectLoginPending,
  selectPasswordRecoveryPending,
  selectRegisterPending,
  selectSessionStatus,
} from '../../store/auth/auth.selectors';
import { AuthState } from '../../store/auth/auth.state';
import {
  ClaimImportedAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthFacade {
  private readonly store = inject(Store);
  private latestState: AuthState = {
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

  readonly sessionStatus$ = this.store.select(selectSessionStatus);
  readonly currentUser$ = this.store.select(selectCurrentUser);
  readonly currentUsername$ = this.store.select(selectCurrentUsername);
  readonly username$ = this.currentUsername$;
  readonly isAuthenticated$ = this.store.select(selectIsAuthenticated);
  readonly bootstrapPending$ = this.store.select(selectBootstrapPending);
  readonly loginPending$ = this.store.select(selectLoginPending);
  readonly registerPending$ = this.store.select(selectRegisterPending);
  readonly refreshPending$ = this.store.select(selectRefreshPending);
  readonly claimPending$ = this.store.select(selectClaimPending);
  readonly passwordRecoveryPending$ = this.store.select(
    selectPasswordRecoveryPending,
  );
  readonly authError$ = this.store.select(selectAuthError);
  readonly infoMessage$ = this.store.select(selectAuthInfoMessage);
  readonly authMessage$ = this.infoMessage$;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    this.store.select(selectAuthState).subscribe((state) => {
      this.latestState = state;
    });
  }

  get username(): string | null {
    return this.latestState.currentUser?.username ?? null;
  }

  get sessionStatus(): AuthState['sessionStatus'] {
    return this.latestState.sessionStatus;
  }

  get bootstrapPending(): boolean {
    return this.latestState.bootstrapPending;
  }

  get refreshPending(): boolean {
    return this.latestState.refreshPending;
  }

  bootstrapSession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (
      this.latestState.sessionStatus !== 'unknown' ||
      this.latestState.bootstrapPending ||
      this.latestState.refreshPending
    ) {
      return;
    }

    this.store.dispatch(AuthActions.bootstrapSession());
  }

  bootstrap(): void {
    this.bootstrapSession();
  }

  login(credentials: LoginRequest, redirectTo?: string | null): void {
    this.store.dispatch(AuthActions.login({ credentials, redirectTo }));
  }

  signIn(credentials: LoginRequest, redirectTo?: string | null): void {
    this.login(credentials, redirectTo);
  }

  register(payload: RegisterRequest, redirectTo?: string | null): void {
    this.store.dispatch(AuthActions.register({ payload, redirectTo }));
  }

  forgotPassword(payload: ForgotPasswordRequest): void {
    this.store.dispatch(AuthActions.forgotPassword({ payload }));
  }

  requestPasswordReset(payload: ForgotPasswordRequest): void {
    this.forgotPassword(payload);
  }

  resetPassword(payload: ResetPasswordRequest): void {
    this.store.dispatch(AuthActions.resetPassword({ payload }));
  }

  claimImportedAccount(
    payload: ClaimImportedAccountRequest,
    redirectTo?: string | null,
  ): void {
    this.store.dispatch(AuthActions.claimImportedAccount({ payload, redirectTo }));
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  isAuthenticated(): boolean {
    return this.latestState.sessionStatus === 'authenticated';
  }

  clearFeedback(): void {
    this.store.dispatch(AuthActions.clearFeedback());
  }
}
