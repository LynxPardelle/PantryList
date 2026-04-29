import { UserProfile } from '../../../application/read-models/user-profile.read-model';
import { UserPreferences } from '../../../domain/value-objects/user-preferences.vo';
import {
  UserPreferencesResponseDto,
  UserProfileResponseDto,
} from '../dtos/profile-response.dto';

export class ProfileMapper {
  static toProfileResponse(profile: UserProfile): UserProfileResponseDto {
    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      status: profile.status,
      connectedIdentityCount: profile.connectedIdentityCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      preferences: profile.preferences,
    };
  }

  static toPreferencesResponse(
    preferences: UserPreferences,
  ): UserPreferencesResponseDto {
    return preferences.toPrimitives();
  }
}
