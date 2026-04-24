import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, Observable, firstValueFrom, isObservable } from 'rxjs';
import { AuthFacade } from '../services/auth.facade';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authFacade: AuthFacadeStub;

  beforeEach(() => {
    authFacade = new AuthFacadeStub();

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        AuthGuard,
        {
          provide: AuthFacade,
          useValue: authFacade,
        },
        {
          provide: PLATFORM_ID,
          useValue: 'browser',
        },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    clearXsrfCookie();
  });

  afterEach(() => {
    clearXsrfCookie();
  });

  it('skips bootstrap on anonymous routes when no xsrf cookie exists', async () => {
    const result = await resolveGuardResult(
      guard.canActivate(
        {
          data: { authMode: 'anonymous' },
        } as unknown as ActivatedRouteSnapshot,
        {
          url: '/login',
        } as unknown as RouterStateSnapshot,
      ),
    );

    expect(result).toBeTrue();
    expect(authFacade.bootstrap).not.toHaveBeenCalled();
  });
});

class AuthFacadeStub {
  readonly sessionStatus$ = new BehaviorSubject<'unknown' | 'authenticated' | 'anonymous'>('unknown');
  readonly bootstrapPending$ = new BehaviorSubject(false);
  readonly refreshPending$ = new BehaviorSubject(false);
  readonly bootstrap = jasmine.createSpy('bootstrap').and.callFake(() => {
    this.sessionStatus$.next('anonymous');
  });
}

async function resolveGuardResult(
  result: boolean | UrlTree | Observable<boolean | UrlTree>,
): Promise<boolean | UrlTree> {
  return isObservable(result) ? firstValueFrom(result) : result;
}

function clearXsrfCookie(): void {
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
}