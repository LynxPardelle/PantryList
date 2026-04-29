import { FastifyRequest } from 'fastify';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import { UpdateUserPreferencesUseCase } from '../../../application/use-cases/update-user-preferences.use-case';
import { UserPreferences } from '../../../domain/value-objects/user-preferences.vo';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { ProfileController } from './profile.controller';

describe('ProfileController', () => {
  it('returns the current profile with preferences', async () => {
    const { controller, getUserProfileUseCase } = makeController();

    const profile = await controller.getProfile({ userId: 'user-1' });

    expect(getUserProfileUseCase.execute.mock.calls[0]).toEqual(['user-1']);
    expect(profile.preferences.expirationWarningDays).toBe(7);
  });

  it('requires XSRF before updating preferences', async () => {
    const { controller, authCookieService, updateUserPreferencesUseCase } =
      makeController();
    const request = { method: 'PATCH' } as FastifyRequest;

    const preferences = await controller.updatePreferences(
      { userId: 'user-1' },
      {
        showExpiredEntryAlert: false,
      },
      request,
    );

    expect(authCookieService.ensureXsrfForRequest.mock.calls[0]).toEqual([
      request,
    ]);
    expect(updateUserPreferencesUseCase.execute.mock.calls[0]).toEqual([
      'user-1',
      {
        showExpiredEntryAlert: false,
      },
    ]);
    expect(preferences.showExpiredEntryAlert).toBe(false);
  });
});

function makeController(): {
  controller: ProfileController;
  getUserProfileUseCase: jest.Mocked<GetUserProfileUseCase>;
  updateUserPreferencesUseCase: jest.Mocked<UpdateUserPreferencesUseCase>;
  authCookieService: jest.Mocked<AuthCookieService>;
} {
  const getUserProfileUseCase = {
    execute: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'chef@example.com',
      username: 'chef',
      status: 'active',
      connectedIdentityCount: 1,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
      preferences: UserPreferences.resolve().toPrimitives(),
    }),
  } as unknown as jest.Mocked<GetUserProfileUseCase>;
  const updateUserPreferencesUseCase = {
    execute: jest.fn().mockResolvedValue(
      UserPreferences.resolve({
        showExpiredEntryAlert: false,
      }),
    ),
  } as unknown as jest.Mocked<UpdateUserPreferencesUseCase>;
  const authCookieService = {
    ensureXsrfForRequest: jest.fn(),
  } as unknown as jest.Mocked<AuthCookieService>;

  return {
    controller: new ProfileController(
      getUserProfileUseCase,
      updateUserPreferencesUseCase,
      authCookieService,
    ),
    getUserProfileUseCase,
    updateUserPreferencesUseCase,
    authCookieService,
  };
}
