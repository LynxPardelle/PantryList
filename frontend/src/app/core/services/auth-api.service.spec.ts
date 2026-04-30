import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthUser } from '../../shared/models/auth.model';
import { AuthApiService } from './auth-api.service';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(AuthApiService);
    httpMock = TestBed.inject(HttpTestingController);
    clearXsrfCookie();
  });

  afterEach(() => {
    httpMock.verify();
    clearXsrfCookie();
  });

  it('returns anonymous without calling refresh when bootstrap gets 401 and no xsrf cookie exists', () => {
    let bootstrapResult: AuthUser | null | undefined;

    service.bootstrapCurrentUser().subscribe((user) => {
      bootstrapResult = user;
    });

    const meRequest = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    expect(meRequest.request.method).toBe('GET');
    expect(meRequest.request.withCredentials).toBeTrue();
    meRequest.flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
    expect(bootstrapResult).toBeNull();
  });

  it('builds Cognito login URLs with provider and redirect path', () => {
    expect(service.buildCognitoLoginUrl('Google', '/pantry')).toBe(
      `${environment.apiUrl}/auth/cognito/login?provider=Google&redirectTo=%2Fpantry`,
    );
  });

  it('loads enabled Cognito providers from the backend', () => {
    let providers: string[] | undefined;

    service.getCognitoProviders().subscribe((response) => {
      providers = response;
    });

    const request = httpMock.expectOne(
      `${environment.apiUrl}/auth/cognito/providers`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ providers: [' Google ', 'COGNITO', ''] });

    expect(providers).toEqual(['Google', 'COGNITO']);
  });

  it('logs out through the Cognito-backed backend endpoint', () => {
    let logoutUrl: string | undefined;
    document.cookie = 'XSRF-TOKEN=logout-token; path=/';

    service.logout().subscribe((response) => {
      logoutUrl = response.logoutUrl;
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.get('x-xsrf-token')).toBe('logout-token');
    request.flush({ logoutUrl: 'https://cognito.example/logout' });

    expect(logoutUrl).toBe('https://cognito.example/logout');
  });

  it('sends the XSRF token when refreshing the Cognito session', () => {
    let refreshedUser: AuthUser | undefined;
    document.cookie = 'XSRF-TOKEN=refresh-token; path=/';

    service.refreshSession().subscribe((user) => {
      refreshedUser = user;
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeTrue();
    expect(request.request.headers.get('x-xsrf-token')).toBe('refresh-token');

    request.flush(makeApiUser());

    expect(refreshedUser?.id).toBe('user-1');
  });
});

function makeApiUser(): AuthUser {
  return {
    id: 'user-1',
    email: 'user@pantrylist.local',
    username: 'user',
    status: 'active',
    createdAt: new Date('2026-04-27T00:00:00.000Z'),
    updatedAt: new Date('2026-04-27T00:00:00.000Z'),
  };
}

function clearXsrfCookie(): void {
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
}
