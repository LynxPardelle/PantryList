import {
  UserPreferences,
  UserPreferencesPatch,
} from '../../../domain/value-objects/user-preferences.vo';
import { UserId } from '../../../domain/value-objects/user-id.vo';

export interface UserPreferencesDao {
  findByUserId(userId: UserId): Promise<UserPreferences>;
  save(
    userId: UserId,
    preferences: UserPreferences | UserPreferencesPatch,
  ): Promise<UserPreferences>;
}
