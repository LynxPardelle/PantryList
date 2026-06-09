import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDao, UserPreferencesDao } from '../ports/daos';
import { USER_DAO, USER_PREFERENCES_DAO } from '../tokens';
import { buildRetentionPolicy } from '../policies/retention-policy';
import { UserProfile } from '../read-models/user-profile.read-model';
import { UserId } from '../../domain/value-objects/user-id.vo';

@Injectable()
export class GetUserProfileUseCase {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    @Inject(USER_PREFERENCES_DAO)
    private readonly preferencesDao: UserPreferencesDao,
    private readonly configService: ConfigService,
  ) {}

  async execute(userId: string): Promise<UserProfile> {
    const normalizedUserId = UserId.fromString(userId);
    const user = await this.userDao.findById(normalizedUserId);

    if (!user) {
      throw new NotFoundException('User profile was not found');
    }

    const preferences =
      await this.preferencesDao.findByUserId(normalizedUserId);

    return {
      id: user.id.toString(),
      email: user.email,
      username: user.username,
      status: user.status,
      connectedIdentityCount: user.authSubjectIds.length,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      preferences: preferences.toPrimitives(),
      retentionPolicy: buildRetentionPolicy(this.configService),
    };
  }
}
