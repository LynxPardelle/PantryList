import { UserProfile } from '../../../application/read-models/user-profile.read-model';
import { UserPreferences } from '../../../domain/value-objects/user-preferences.vo';
import {
  ProfileSecurityResponseDto,
  UserPreferencesResponseDto,
  UserProfileResponseDto,
} from '../dtos/profile-response.dto';

export class ProfileMapper {
  static toProfileResponse(
    profile: UserProfile,
    security: ProfileSecurityResponseDto = {
      stepUp: {
        enabled: false,
        maxAgeSeconds: 900,
        fresh: true,
      },
    },
  ): UserProfileResponseDto {
    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      status: profile.status,
      connectedIdentityCount: profile.connectedIdentityCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      preferences: profile.preferences,
      retentionPolicy: profile.retentionPolicy,
      security,
    };
  }

  static toPreferencesResponse(
    preferences: UserPreferences,
  ): UserPreferencesResponseDto {
    return preferences.toPrimitives();
  }
}
