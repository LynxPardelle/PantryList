import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiUserProfile,
  UserPreferences,
  UserPreferencesUpdate,
  UserProfile,
} from '../../shared/models/profile.model';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly profileUrl = `${environment.apiUrl}/profile`;

  constructor(private readonly http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http
      .get<ApiUserProfile>(this.profileUrl)
      .pipe(map((profile) => this.normalizeProfile(profile)));
  }

  updatePreferences(
    preferences: UserPreferencesUpdate,
  ): Observable<UserPreferences> {
    return this.http.patch<UserPreferences>(
      `${this.profileUrl}/preferences`,
      preferences,
    );
  }

  private normalizeProfile(profile: ApiUserProfile): UserProfile {
    return {
      ...profile,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
    };
  }
}
