import { UserPreferences } from './user-preferences.vo';

describe('UserPreferences', () => {
  it('resolves defaults when persisted preferences are missing', () => {
    expect(UserPreferences.resolve().toPrimitives()).toEqual({
      expirationWarningDays: 7,
      showExpiredEntryAlert: true,
      depletionWarningThresholdRatio: 1,
      shoppingPlanLeadDays: 3,
      showGuidanceTips: true,
    });
  });

  it('merges partial updates over current preferences', () => {
    const current = UserPreferences.resolve({
      expirationWarningDays: 10,
      showExpiredEntryAlert: false,
      depletionWarningThresholdRatio: 1.5,
      shoppingPlanLeadDays: 4,
      showGuidanceTips: true,
    });

    const updated = current.patch({
      expirationWarningDays: 5,
      showExpiredEntryAlert: true,
    });

    expect(updated.toPrimitives()).toEqual({
      expirationWarningDays: 5,
      showExpiredEntryAlert: true,
      depletionWarningThresholdRatio: 1.5,
      shoppingPlanLeadDays: 4,
      showGuidanceTips: true,
    });
  });

  it('rejects invalid preference boundaries', () => {
    expect(() => UserPreferences.resolve({ expirationWarningDays: 0 })).toThrow(
      'Expiration warning days must be between 1 and 60',
    );
    expect(() =>
      UserPreferences.resolve({ depletionWarningThresholdRatio: 4.5 }),
    ).toThrow('Depletion warning threshold ratio must be between 0.25 and 4');
    expect(() => UserPreferences.resolve({ shoppingPlanLeadDays: 31 })).toThrow(
      'Shopping plan lead days must be between 0 and 30',
    );
  });
});
