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
});

function clearXsrfCookie(): void {
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
}