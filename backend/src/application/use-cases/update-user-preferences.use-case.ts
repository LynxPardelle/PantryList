import { Inject, Injectable } from '@nestjs/common';
import {
  UserPreferences,
  UserPreferencesPatch,
} from '../../domain/value-objects';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { UserPreferencesDao } from '../ports/daos';
import { USER_PREFERENCES_DAO } from '../tokens';

@Injectable()
export class UpdateUserPreferencesUseCase {
  constructor(
    @Inject(USER_PREFERENCES_DAO)
    private readonly preferencesDao: UserPreferencesDao,
  ) {}

  async execute(
    userId: string,
    patch: UserPreferencesPatch,
  ): Promise<UserPreferences> {
    const normalizedUserId = UserId.fromString(userId);
    const current = await this.preferencesDao.findByUserId(normalizedUserId);
    const updated = current.patch(patch);

    return this.preferencesDao.save(normalizedUserId, updated);
  }
}
