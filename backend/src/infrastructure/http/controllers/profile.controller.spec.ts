import { FastifyReply, FastifyRequest } from 'fastify';
import { DeleteAccountUseCase } from '../../../application/use-cases/delete-account.use-case';
import { DeletePantryDataUseCase } from '../../../application/use-cases/delete-pantry-data.use-case';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile.use-case';
import { ResolveHouseholdPantryAccessUseCase } from '../../../application/use-cases/household.use-cases';
import { SignOutAllSessionsUseCase } from '../../../application/use-cases/sign-out-all-sessions.use-case';
import { UpdateUserPreferencesUseCase } from '../../../application/use-cases/update-user-preferences.use-case';
import { UserPreferences } from '../../../domain/value-objects/user-preferences.vo';
import { AuthCookieService } from '../auth/auth-cookie.service';
import { AuthStepUpService } from '../auth/auth-step-up.service';
import { ProfileController } from './profile.controller';

describe('ProfileController', () => {
  it('returns the current profile with preferences', async () => {
    const { controller, getUserProfileUseCase } = makeController();

    const profile = await controller.getProfile(makeCurrentUser());

    expect(getUserProfileUseCase.execute.mock.calls[0]).toEqual(['user-1']);
    expect(profile.preferences.expirationWarningDays).toBe(7);
    expect(profile.security.stepUp.fresh).toBe(true);
  });

  it('requires XSRF before updating preferences', async () => {
    const { controller, authCookieService, updateUserPreferencesUseCase } =
      makeController();
    const request = { method: 'PATCH' } as FastifyRequest;

    const preferences = await controller.updatePreferences(
      makeCurrentUser(),
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

  it('requires XSRF and confirmation before deleting local pantry data', async () => {
    const { controller, authCookieService, deletePantryDataUseCase } =
      makeController();
    const request = { method: 'DELETE' } as FastifyRequest;

    const result = await controller.deletePantryData(
      makeCurrentUser(),
      {
        confirmationText: 'ELIMINAR',
      },
      request,
    );

    expect(authCookieService.ensureXsrfForRequest.mock.calls[0]).toEqual([
      request,
    ]);
    expect(deletePantryDataUseCase.execute.mock.calls[0]).toEqual([
      {
        userId: 'user-1',
        confirmationText: 'ELIMINAR',
      },
    ]);
    expect(result).toEqual({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
    });
  });

  it('deletes pantry data only through owner household access', async () => {
    const {
      controller,
      resolveHouseholdPantryAccessUseCase,
      deletePantryDataUseCase,
    } = makeController();
    const request = { method: 'DELETE' } as FastifyRequest;
    resolveHouseholdPantryAccessUseCase.executeOwner.mockResolvedValueOnce(
      makeHouseholdAccess({
        requesterUserId: 'owner-user',
        pantryOwnerUserId: 'owner-user',
        role: 'owner',
      }),
    );

    await controller.deletePantryData(
      makeCurrentUser({ userId: 'owner-user' }),
      {
        confirmationText: 'ELIMINAR',
      },
      request,
    );

    expect(
      resolveHouseholdPantryAccessUseCase.executeOwner.mock.calls[0],
    ).toEqual(['owner-user']);
    expect(deletePantryDataUseCase.execute.mock.calls[0]).toEqual([
      {
        userId: 'owner-user',
        confirmationText: 'ELIMINAR',
      },
    ]);
  });

  it('deletes the account and clears session cookies after confirmation', async () => {
    const { controller, authCookieService, deleteAccountUseCase } =
      makeController();
    const request = { method: 'DELETE' } as FastifyRequest;
    const reply = {} as FastifyReply;

    const result = await controller.deleteAccount(
      makeCurrentUser(),
      {
        confirmationText: 'ELIMINAR CUENTA',
      },
      request,
      reply,
    );

    expect(authCookieService.ensureXsrfForRequest.mock.calls[0]).toEqual([
      request,
    ]);
    expect(deleteAccountUseCase.execute.mock.calls[0]).toEqual([
      {
        userId: 'user-1',
        confirmationText: 'ELIMINAR CUENTA',
      },
    ]);
    expect(authCookieService.clearSessionCookies.mock.calls[0]).toEqual([
      reply,
    ]);
    expect(result.deletedCognitoIdentityCount).toBe(1);
  });

  it('signs out all sessions and clears local cookies after confirmation', async () => {
    const { controller, authCookieService, signOutAllSessionsUseCase } =
      makeController();
    const request = { method: 'DELETE' } as FastifyRequest;
    const reply = {} as FastifyReply;

    const result = await controller.signOutAllSessions(
      makeCurrentUser(),
      {
        confirmationText: 'CERRAR SESIONES',
      },
      request,
      reply,
    );

    expect(authCookieService.ensureXsrfForRequest.mock.calls[0]).toEqual([
      request,
    ]);
    expect(signOutAllSessionsUseCase.execute.mock.calls[0]).toEqual([
      {
        userId: 'user-1',
        confirmationText: 'CERRAR SESIONES',
      },
    ]);
    expect(authCookieService.clearSessionCookies.mock.calls[0]).toEqual([
      reply,
    ]);
    expect(result).toEqual({
      revokedCognitoSessionCount: 1,
      localSessionCleared: true,
    });
  });
});

function makeController(): {
  controller: ProfileController;
  getUserProfileUseCase: jest.Mocked<GetUserProfileUseCase>;
  updateUserPreferencesUseCase: jest.Mocked<UpdateUserPreferencesUseCase>;
  deletePantryDataUseCase: jest.Mocked<DeletePantryDataUseCase>;
  deleteAccountUseCase: jest.Mocked<DeleteAccountUseCase>;
  signOutAllSessionsUseCase: jest.Mocked<SignOutAllSessionsUseCase>;
  resolveHouseholdPantryAccessUseCase: jest.Mocked<ResolveHouseholdPantryAccessUseCase>;
  authCookieService: jest.Mocked<AuthCookieService>;
  authStepUpService: jest.Mocked<AuthStepUpService>;
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
      retentionPolicy: {
        archivedRecordRetentionDays: 365,
        archivedRecordAutoDeleteEnabled: false,
        temporaryShoppingShareRetentionDays: 7,
        permanentlyDeletedRecords: 'removed_immediately',
        accountDeletion: 'local_and_cognito_delete_requested',
      },
    }),
  } as unknown as jest.Mocked<GetUserProfileUseCase>;
  const updateUserPreferencesUseCase = {
    execute: jest.fn().mockResolvedValue(
      UserPreferences.resolve({
        showExpiredEntryAlert: false,
      }),
    ),
  } as unknown as jest.Mocked<UpdateUserPreferencesUseCase>;
  const deletePantryDataUseCase = {
    execute: jest.fn().mockResolvedValue({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
    }),
  } as unknown as jest.Mocked<DeletePantryDataUseCase>;
  const deleteAccountUseCase = {
    execute: jest.fn().mockResolvedValue({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
      deletedCognitoIdentityCount: 1,
    }),
  } as unknown as jest.Mocked<DeleteAccountUseCase>;
  const signOutAllSessionsUseCase = {
    execute: jest.fn().mockResolvedValue({
      revokedCognitoSessionCount: 1,
    }),
  } as unknown as jest.Mocked<SignOutAllSessionsUseCase>;
  const authCookieService = {
    ensureXsrfForRequest: jest.fn(),
    clearSessionCookies: jest.fn(),
  } as unknown as jest.Mocked<AuthCookieService>;
  const resolveHouseholdPantryAccessUseCase = {
    executeRead: jest.fn().mockResolvedValue(makeHouseholdAccess()),
    executeWrite: jest.fn().mockResolvedValue(makeHouseholdAccess()),
    executeOwner: jest.fn().mockResolvedValue(makeHouseholdAccess()),
  } as unknown as jest.Mocked<ResolveHouseholdPantryAccessUseCase>;
  const authStepUpService = {
    getStatus: jest.fn().mockReturnValue({
      enabled: false,
      maxAgeSeconds: 900,
      fresh: true,
    }),
    assertFreshAuthentication: jest.fn(),
  } as unknown as jest.Mocked<AuthStepUpService>;

  return {
    controller: new ProfileController(
      getUserProfileUseCase,
      updateUserPreferencesUseCase,
      deletePantryDataUseCase,
      deleteAccountUseCase,
      signOutAllSessionsUseCase,
      resolveHouseholdPantryAccessUseCase,
      authCookieService,
      authStepUpService,
    ),
    getUserProfileUseCase,
    updateUserPreferencesUseCase,
    deletePantryDataUseCase,
    deleteAccountUseCase,
    signOutAllSessionsUseCase,
    resolveHouseholdPantryAccessUseCase,
    authCookieService,
    authStepUpService,
  };
}

function makeCurrentUser(overrides: Partial<{ userId: string }> = {}) {
  return {
    userId: 'user-1',
    authSubjectId: 'auth-subject-1',
    authenticatedAt: new Date('2026-06-08T00:00:00.000Z'),
    ...overrides,
  };
}

function makeHouseholdAccess(
  overrides: Partial<{
    requesterUserId: string;
    householdId: string;
    pantryOwnerUserId: string;
    role: 'owner' | 'editor' | 'viewer';
  }> = {},
) {
  return {
    requesterUserId: 'user-1',
    householdId: 'household-1',
    pantryOwnerUserId: 'user-1',
    role: 'owner' as const,
    ...overrides,
  };
}
