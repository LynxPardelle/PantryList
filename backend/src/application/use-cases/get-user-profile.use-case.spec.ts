import { ConfigService } from '@nestjs/config';
import { User } from '../../domain/entities/user.entity';
import { UserAccountStatus } from '../../domain/enums';
import { UserPreferences } from '../../domain/value-objects/user-preferences.vo';
import { UserDao, UserPreferencesDao } from '../ports/daos';
import { UserDeviceRepository } from '../../domain/repositories/user-device.repository';
import { GetUserProfileUseCase } from './get-user-profile.use-case';

describe('GetUserProfileUseCase', () => {
  it('returns account summary with resolved preferences', async () => {
    const user = User.fromPrimitives({
      id: 'user-1',
      email: 'chef@example.com',
      username: 'chef',
      authSubjectIds: ['cognito-sub', 'google-sub'],
      status: UserAccountStatus.ACTIVE,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    });
    const userDao = {
      findById: jest.fn().mockResolvedValue(user),
    } as unknown as jest.Mocked<UserDao>;
    const preferencesDao = {
      findByUserId: jest.fn().mockResolvedValue(
        UserPreferences.resolve({
          expirationWarningDays: 10,
          showExpiredEntryAlert: false,
          depletionWarningThresholdRatio: 1.5,
          shoppingPlanLeadDays: 5,
        }),
      ),
    } as unknown as jest.Mocked<UserPreferencesDao>;
    const userDeviceRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      deleteByUserId: jest.fn(),
    } as unknown as jest.Mocked<UserDeviceRepository>;
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          ARCHIVED_RECORD_RETENTION_DAYS: '180',
          ARCHIVED_RECORD_AUTO_DELETE_ENABLED: 'false',
          TEMPORARY_SHOPPING_SHARE_RETENTION_DAYS: '7',
        };

        return values[key];
      }),
    } as unknown as ConfigService;

    const profile = await new GetUserProfileUseCase(
      userDao,
      preferencesDao,
      userDeviceRepository,
      configService,
    ).execute('user-1');

    expect(profile).toMatchObject({
      id: 'user-1',
      email: 'chef@example.com',
      username: 'chef',
      connectedIdentityCount: 2,
      preferences: {
        expirationWarningDays: 10,
        showExpiredEntryAlert: false,
        depletionWarningThresholdRatio: 1.5,
        shoppingPlanLeadDays: 5,
      },
      retentionPolicy: {
        archivedRecordRetentionDays: 180,
        archivedRecordAutoDeleteEnabled: false,
        temporaryShoppingShareRetentionDays: 7,
      },
      knownDevices: [],
    });
    expect(userDeviceRepository.findByUserId).toHaveBeenCalled();
  });
});
