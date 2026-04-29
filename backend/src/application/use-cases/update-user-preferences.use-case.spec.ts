import { UserPreferences } from '../../domain/value-objects/user-preferences.vo';
import { UserPreferencesDao } from '../ports/daos';
import { UpdateUserPreferencesUseCase } from './update-user-preferences.use-case';

describe('UpdateUserPreferencesUseCase', () => {
  it('merges partial patches over current resolved preferences before saving', async () => {
    const current = UserPreferences.resolve({
      expirationWarningDays: 7,
      showExpiredEntryAlert: true,
      depletionWarningThresholdRatio: 1,
      shoppingPlanLeadDays: 3,
    });
    const preferencesDao = {
      findByUserId: jest.fn().mockResolvedValue(current),
      save: jest.fn().mockImplementation(async (_userId, preferences) => preferences),
    } as unknown as jest.Mocked<UserPreferencesDao>;

    const updated = await new UpdateUserPreferencesUseCase(preferencesDao).execute(
      'user-1',
      {
        showExpiredEntryAlert: false,
        shoppingPlanLeadDays: 6,
      },
    );

    expect(preferencesDao.save.mock.calls[0]?.[0].toString()).toBe('user-1');
    expect(updated.toPrimitives()).toEqual({
      expirationWarningDays: 7,
      showExpiredEntryAlert: false,
      depletionWarningThresholdRatio: 1,
      shoppingPlanLeadDays: 6,
    });
  });
});
