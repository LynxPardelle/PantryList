import { inject, Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Observable, of, timer } from 'rxjs';
import {
  catchError,
  exhaustMap,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { AuthApiService } from '../../core/services/auth-api.service';
import * as AuthActions from './auth.actions';
import * as PantryActions from '../pantry/pantry.actions';
import * as ProductActions from '../product/product.actions';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly authApiService = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  readonly bootstrapSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.bootstrapSession),
      exhaustMap(() =>
        this.authApiService.bootstrapCurrentUser().pipe(
          map((user) =>
            user
              ? AuthActions.bootstrapSessionSuccess({ user })
              : AuthActions.bootstrapSessionAnonymous(),
          ),
          catchError((error) =>
            of(
              AuthActions.bootstrapSessionFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ credentials, redirectTo }) =>
        this.authApiService.login(credentials).pipe(
          map((user) => AuthActions.loginSuccess({ user, redirectTo })),
          catchError((error) =>
            of(
              AuthActions.loginFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap(({ payload, redirectTo }) =>
        this.authApiService.register(payload).pipe(
          map((user) => AuthActions.registerSuccess({ user, redirectTo })),
          catchError((error) =>
            of(
              AuthActions.registerFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly forgotPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.forgotPassword),
      exhaustMap(({ payload }) =>
        this.authApiService.forgotPassword(payload).pipe(
          map((response) =>
            AuthActions.forgotPasswordSuccess({ message: response.message }),
          ),
          catchError((error) =>
            of(
              AuthActions.forgotPasswordFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly resetPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.resetPassword),
      exhaustMap(({ payload }) =>
        this.authApiService.resetPassword(payload).pipe(
          map((response) =>
            AuthActions.resetPasswordSuccess({ message: response.message }),
          ),
          catchError((error) =>
            of(
              AuthActions.resetPasswordFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly claimImportedAccount$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.claimImportedAccount),
      exhaustMap(({ payload, redirectTo }) =>
        this.authApiService.claimImportedAccount(payload).pipe(
          map((user) =>
            AuthActions.claimImportedAccountSuccess({ user, redirectTo }),
          ),
          catchError((error) =>
            of(
              AuthActions.claimImportedAccountFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            ),
          ),
        ),
      ),
    ),
  );

  readonly refreshSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshSession),
      exhaustMap(() =>
        this.authApiService.refreshSession().pipe(
          map((user) => AuthActions.refreshSessionSuccess({ user })),
          catchError((error) => {
            if (this.authApiService.isUnauthorized(error)) {
              return of(
                AuthActions.sessionExpired({
                  error: 'La sesion expiro. Vuelve a iniciar sesion.',
                }),
              );
            }

            return of(
              AuthActions.refreshSessionFailure({
                error: this.authApiService.getErrorMessage(error),
              }),
            );
          }),
        ),
      ),
    ),
  );

  readonly logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        this.authApiService.logout().pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError((error) =>
            this.authApiService.isUnauthorized(error)
              ? of(AuthActions.logoutSuccess())
              : of(
                  AuthActions.logoutFailure({
                    error: this.authApiService.getErrorMessage(error),
                  }),
                ),
          ),
        ),
      ),
    ),
  );

  readonly scheduleRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AuthActions.bootstrapSessionSuccess,
        AuthActions.loginSuccess,
        AuthActions.registerSuccess,
        AuthActions.claimImportedAccountSuccess,
        AuthActions.refreshSessionSuccess,
      ),
      switchMap(() =>
        this.sessionRefreshTicker().pipe(
          map(() => AuthActions.refreshSession()),
          takeUntil(
            this.actions$.pipe(
              ofType(
                AuthActions.logout,
                AuthActions.logoutSuccess,
                AuthActions.sessionExpired,
                AuthActions.bootstrapSessionAnonymous,
              ),
            ),
          ),
        ),
      ),
    ),
  );

  readonly resetPantryOnSessionEnd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AuthActions.logout,
        AuthActions.logoutSuccess,
        AuthActions.sessionExpired,
        AuthActions.bootstrapSessionAnonymous,
      ),
      map(() => PantryActions.resetPantry()),
    ),
  );

  readonly resetProductsOnSessionEnd$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AuthActions.logout,
        AuthActions.logoutSuccess,
        AuthActions.sessionExpired,
        AuthActions.bootstrapSessionAnonymous,
      ),
      map(() => ProductActions.resetProducts()),
    ),
  );

  readonly navigateAfterAuthSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          AuthActions.loginSuccess,
          AuthActions.registerSuccess,
          AuthActions.claimImportedAccountSuccess,
        ),
        tap(({ redirectTo }) => {
          void this.router.navigateByUrl(this.normalizeRedirectTo(redirectTo));
        }),
      ),
    { dispatch: false },
  );

  readonly navigateAfterSessionEnd$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout, AuthActions.sessionExpired),
        tap(() => {
          void this.router.navigateByUrl('/login');
        }),
      ),
    { dispatch: false },
  );

  private normalizeRedirectTo(redirectTo?: string | null): string {
    if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
      return '/pantry';
    }

    if (redirectTo === '/login' || redirectTo.startsWith('/login?')) {
      return '/pantry';
    }

    return redirectTo;
  }

  private sessionRefreshTicker(): Observable<number> {
    return new Observable<number>((subscriber) => {
      const subscription = this.ngZone.runOutsideAngular(() =>
        timer(10 * 60 * 1000, 10 * 60 * 1000).subscribe({
          next: (value) => this.ngZone.run(() => subscriber.next(value)),
          error: (error) => this.ngZone.run(() => subscriber.error(error)),
          complete: () => this.ngZone.run(() => subscriber.complete()),
        }),
      );

      return () => subscription.unsubscribe();
    });
  }
}
