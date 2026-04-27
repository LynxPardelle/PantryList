import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../store/auth/auth.actions';
import {
  selectAuthError,
  selectAuthInfoMessage,
  selectBootstrapPending,
  selectCurrentUser,
  selectCurrentUsername,
  selectRefreshPending,
  selectAuthState,
  selectIsAuthenticated,
  selectLoginPending,
  selectSessionStatus,
} from '../../store/auth/auth.selectors';
import { AuthState } from '../../store/auth/auth.state';

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
    refreshPending: false,
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
  readonly refreshPending$ = this.store.select(selectRefreshPending);
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

  login(provider?: string | null, redirectTo?: string | null): void {
    this.store.dispatch(AuthActions.login({ provider, redirectTo }));
  }

  startCognitoLogin(provider?: string | null, redirectTo?: string | null): void {
    this.login(provider, redirectTo);
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
