import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiAuthUser,
  AuthUser,
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

  buildCognitoLoginUrl(
    provider?: string | null,
    redirectTo?: string | null,
  ): string {
    const params = new URLSearchParams();

    if (provider) {
      params.set('provider', provider);
    }

    if (redirectTo) {
      params.set('redirectTo', redirectTo);
    }

    const queryString = params.toString();

    return `${this.authUrl}/cognito/login${queryString ? `?${queryString}` : ''}`;
  }

  refreshSession(): Observable<AuthUser> {
    return this.http
      .post<ApiAuthUser>(`${this.authUrl}/refresh`, {}, { withCredentials: true })
      .pipe(map((user) => this.normalizeUser(user)));
  }

  logout(): Observable<{ logoutUrl: string }> {
    return this.http.post<{ logoutUrl: string }>(
      `${this.authUrl}/logout`,
      {},
      { withCredentials: true },
    );
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
