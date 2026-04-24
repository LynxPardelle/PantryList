import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly storageKey = 'pantrylist.username';
  private readonly usernameSubject = new BehaviorSubject<string | null>(null);
  readonly username$ = this.usernameSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.usernameSubject.next(window.localStorage.getItem(this.storageKey));
    }
  }

  get username(): string | null {
    return this.usernameSubject.value;
  }

  isAuthenticated(): boolean {
    return Boolean(this.usernameSubject.value);
  }

  login(username: string): void {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.setItem(this.storageKey, normalizedUsername);
    }

    this.usernameSubject.next(normalizedUsername);
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.localStorage.removeItem(this.storageKey);
    }

    this.usernameSubject.next(null);
  }
}
