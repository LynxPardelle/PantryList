import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject } from 'rxjs';
import { AuthApiService } from '../../core/services/auth-api.service';
import { AuthUser } from '../../shared/models/auth.model';
import * as AuthActions from './auth.actions';
import { AuthEffects } from './auth.effects';

describe('AuthEffects', () => {
  let actions$: ReplaySubject<ReturnType<typeof AuthActions.bootstrapSessionSuccess>>;
  let effects: AuthEffects;
  let runOutsideAngularSpy: jasmine.Spy;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);

    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        {
          provide: AuthApiService,
          useValue: {},
        },
        {
          provide: Router,
          useValue: jasmine.createSpyObj<Router>('Router', ['navigateByUrl']),
        },
      ],
    });

    effects = TestBed.inject(AuthEffects);
    runOutsideAngularSpy = spyOn(
      TestBed.inject(NgZone),
      'runOutsideAngular',
    ).and.callThrough();
  });

  afterEach(() => {
    actions$.complete();
  });

  it('schedules session refresh timers outside Angular so hydration can stabilize', () => {
    const subscription = effects.scheduleRefresh$.subscribe();

    actions$.next(AuthActions.bootstrapSessionSuccess({ user: makeUser() }));

    expect(runOutsideAngularSpy).toHaveBeenCalled();
    subscription.unsubscribe();
  });
});

function makeUser(): AuthUser {
  const date = new Date('2026-04-27T00:00:00.000Z');

  return {
    id: 'user-1',
    email: 'user@pantrylist.local',
    username: 'user',
    status: 'active',
    createdAt: date,
    updatedAt: date,
  };
}
