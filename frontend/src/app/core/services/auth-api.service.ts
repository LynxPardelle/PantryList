import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiAuthUser,
  AuthUser,
  ClaimImportedAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../../shared/models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly authUrl = `${environment.apiUrl}/auth`;

  constructor(private readonly http: HttpClient) {}

  bootstrapCurrentUser(): Observable<AuthUser | null> {
    return this.getCurrentUser().pipe(
      catchError((error) => {
        if (!this.isUnauthorized(error)) {
          return throwError(() => error);
        }

        if (!this.hasXsrfTokenCookie()) {
          return of(null);
        }

        return this.refreshSession().pipe(
          catchError((refreshError) => {
            if (this.isUnauthorized(refreshError)) {
              return of(null);
            }

            return throwError(() => refreshError);
          }),
        );
      }),
    );
  }

  getCurrentUser(): Observable<AuthUser> {
    return this.http
      .get<ApiAuthUser>(`${this.authUrl}/me`, { withCredentials: true })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<ApiAuthUser>(`${this.authUrl}/login`, credentials, {
        withCredentials: true,
      })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  register(payload: RegisterRequest): Observable<AuthUser> {
    return this.http
      .post<ApiAuthUser>(`${this.authUrl}/register`, payload, {
        withCredentials: true,
      })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  forgotPassword(payload: ForgotPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.authUrl}/password/forgot`,
      payload,
      {
        withCredentials: true,
      },
    );
  }

  resetPassword(payload: ResetPasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.authUrl}/password/reset`,
      payload,
      {
        withCredentials: true,
      },
    );
  }

  claimImportedAccount(payload: ClaimImportedAccountRequest): Observable<AuthUser> {
    return this.http
      .post<ApiAuthUser>(`${this.authUrl}/claim-imported-account`, payload, {
        withCredentials: true,
      })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  refreshSession(): Observable<AuthUser> {
    return this.http
      .post<ApiAuthUser>(`${this.authUrl}/refresh`, {}, { withCredentials: true })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/logout`, {}, { withCredentials: true });
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage =
        typeof error.error?.message === 'string' ? error.error.message : null;
      return apiMessage ?? error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'No se pudo completar la solicitud de autenticacion.';
  }

  isUnauthorized(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 401;
  }

  private hasXsrfTokenCookie(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    return document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .some((cookie) => cookie.startsWith('XSRF-TOKEN='));
  }

  private normalizeUser(user: ApiAuthUser): AuthUser {
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }
}
