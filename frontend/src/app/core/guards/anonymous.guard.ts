import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import * as AuthActions from '../../store/auth/auth.actions';
import { selectSessionStatus } from '../../store/auth/auth.selectors';

@Injectable({
  providedIn: 'root',
})
export class AnonymousGuard implements CanActivate {
  constructor(
    private readonly store: Store,
    private readonly router: Router,
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    this.store.dispatch(AuthActions.bootstrapSession());

    return this.store.select(selectSessionStatus).pipe(
      filter((status) => status !== 'unknown'),
      take(1),
      map((status) =>
        status === 'authenticated'
          ? this.router.createUrlTree(['/pantry'])
          : true,
      ),
    );
  }
}
