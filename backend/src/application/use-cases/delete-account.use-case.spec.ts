import { BadRequestException } from '@nestjs/common';
import { CognitoUserAdmin } from '../ports/cognito-auth.port';
import { UserDao } from '../ports/daos';
import { User } from '../../domain/entities/user.entity';
import { HouseholdMembership } from '../../domain/entities/household.entity';
import { UserAccountStatus } from '../../domain/enums';
import { HouseholdRepository } from '../../domain/repositories/household.repository';
import { UserDeviceRepository } from '../../domain/repositories/user-device.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { DeletePantryDataUseCase } from './delete-pantry-data.use-case';
import { DeleteAccountUseCase } from './delete-account.use-case';

describe('DeleteAccountUseCase', () => {
  it('requires explicit account deletion confirmation', async () => {
    const { useCase, userDao } = makeUseCase();

    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationText: 'ELIMINAR',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userDao.findById).not.toHaveBeenCalled();
  });

  it('blocks owner deletion while other household members remain', async () => {
    const { useCase, householdRepository } = makeUseCase({
      membership: makeMembership('user-1', 'owner'),
      members: [
        makeMembership('user-1', 'owner'),
        makeMembership('member-1', 'editor'),
      ],
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationText: 'ELIMINAR CUENTA',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(householdRepository.deleteHouseholdCascade).not.toHaveBeenCalled();
  });

  it('deletes pantry data, household, Cognito identity, and local user', async () => {
    const {
      useCase,
      userDao,
      householdRepository,
      cognitoUserAdmin,
      userDeviceRepository,
      deletePantryDataUseCase,
    } = makeUseCase({
      membership: makeMembership('user-1', 'owner'),
      members: [makeMembership('user-1', 'owner')],
    });

    await expect(
      useCase.execute({
        userId: 'user-1',
        confirmationText: 'ELIMINAR CUENTA',
      }),
    ).resolves.toEqual({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
      deletedWasteEventCount: 4,
      deletedKnownDeviceCount: 2,
      deletedCognitoIdentityCount: 1,
    });
    expect(cognitoUserAdmin.deleteUsersBySubjectIds).toHaveBeenCalledWith([
      'auth-subject-1',
    ]);
    expect(deletePantryDataUseCase.execute).toHaveBeenCalledWith({
      userId: 'user-1',
      confirmationText: 'ELIMINAR',
    });
    expect(householdRepository.deleteHouseholdCascade).toHaveBeenCalledWith(
      'household-1',
    );
    expect(userDeviceRepository.deleteByUserId).toHaveBeenCalledWith(
      UserId.fromString('user-1'),
    );
    expect(userDao.delete).toHaveBeenCalledWith(UserId.fromString('user-1'));
    expect(
      deletePantryDataUseCase.execute.mock.invocationCallOrder[0],
    ).toBeLessThan(
      cognitoUserAdmin.deleteUsersBySubjectIds.mock.invocationCallOrder[0],
    );
    expect(
      userDeviceRepository.deleteByUserId.mock.invocationCallOrder[0],
    ).toBeLessThan(
      cognitoUserAdmin.deleteUsersBySubjectIds.mock.invocationCallOrder[0],
    );
    expect(
      cognitoUserAdmin.deleteUsersBySubjectIds.mock.invocationCallOrder[0],
    ).toBeLessThan(userDao.delete.mock.invocationCallOrder[0]);
  });
});

function makeUseCase(
  options: {
    membership?: HouseholdMembership | null;
    members?: HouseholdMembership[];
  } = {},
) {
  const userDao = {
    findById: jest.fn().mockResolvedValue(
      User.fromPrimitives({
        id: 'user-1',
        email: 'chef@example.com',
        username: 'chef',
        authSubjectIds: ['auth-subject-1'],
        status: UserAccountStatus.ACTIVE,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    ),
    delete: jest.fn(),
  } as unknown as jest.Mocked<UserDao>;
  const householdRepository = {
    findMembershipByUserId: jest
      .fn()
      .mockResolvedValue(options.membership ?? null),
    findMembersByHouseholdId: jest
      .fn()
      .mockResolvedValue(options.members ?? []),
    deleteHouseholdCascade: jest.fn(),
    deleteMembership: jest.fn(),
  } as unknown as jest.Mocked<HouseholdRepository>;
  const cognitoUserAdmin = {
    deleteUsersBySubjectIds: jest.fn().mockResolvedValue(1),
    signOutUsersBySubjectIds: jest.fn(),
  } as unknown as jest.Mocked<CognitoUserAdmin>;
  const deletePantryDataUseCase = {
    execute: jest.fn().mockResolvedValue({
      deletedInventoryLotCount: 5,
      deletedProductTypeCount: 3,
      deletedShoppingShareCount: 2,
      deletedWasteEventCount: 4,
    }),
  } as unknown as jest.Mocked<DeletePantryDataUseCase>;
  const userDeviceRepository = {
    deleteByUserId: jest.fn().mockResolvedValue(2),
  } as unknown as jest.Mocked<UserDeviceRepository>;
  const useCase = new DeleteAccountUseCase(
    userDao,
    householdRepository,
    cognitoUserAdmin,
    userDeviceRepository,
    deletePantryDataUseCase,
  );

  return {
    useCase,
    userDao,
    householdRepository,
    cognitoUserAdmin,
    userDeviceRepository,
    deletePantryDataUseCase,
  };
}

function makeMembership(
  userId: string,
  role: 'owner' | 'editor' | 'viewer',
): HouseholdMembership {
  return HouseholdMembership.fromPrimitives({
    householdId: 'household-1',
    userId,
    email: `${userId}@example.com`,
    username: userId,
    role,
    joinedAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  });
}
