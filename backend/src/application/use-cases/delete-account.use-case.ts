import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CognitoUserAdmin } from '../ports/cognito-auth.port';
import { UserDao } from '../ports/daos';
import { COGNITO_USER_ADMIN, HOUSEHOLD_REPOSITORY, USER_DAO } from '../tokens';
import { HouseholdRepository } from '../../domain/repositories/household.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { DeletePantryDataUseCase } from './delete-pantry-data.use-case';

const DELETE_ACCOUNT_CONFIRMATION = 'ELIMINAR CUENTA';

export interface DeleteAccountResult {
  deletedInventoryLotCount: number;
  deletedProductTypeCount: number;
  deletedShoppingShareCount: number;
  deletedCognitoIdentityCount: number;
}

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    @Inject(HOUSEHOLD_REPOSITORY)
    private readonly householdRepository: HouseholdRepository,
    @Inject(COGNITO_USER_ADMIN)
    private readonly cognitoUserAdmin: CognitoUserAdmin,
    private readonly deletePantryDataUseCase: DeletePantryDataUseCase,
  ) {}

  async execute(command: {
    userId: string;
    confirmationText: string;
  }): Promise<DeleteAccountResult> {
    if (command.confirmationText.trim() !== DELETE_ACCOUNT_CONFIRMATION) {
      throw new BadRequestException(
        `Confirmation text must be ${DELETE_ACCOUNT_CONFIRMATION}`,
      );
    }

    const userId = UserId.fromString(command.userId);
    const user = await this.userDao.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.assertHouseholdCanBeDeletedOrLeft(command.userId);

    const pantryResult = await this.deletePantryDataUseCase.execute({
      userId: command.userId,
      confirmationText: 'ELIMINAR',
    });
    await this.deleteHouseholdOrMembership(command.userId);
    const deletedCognitoIdentityCount =
      await this.cognitoUserAdmin.deleteUsersBySubjectIds(user.authSubjectIds);
    await this.userDao.delete(userId);

    return {
      ...pantryResult,
      deletedCognitoIdentityCount,
    };
  }

  private async assertHouseholdCanBeDeletedOrLeft(
    userId: string,
  ): Promise<void> {
    const membership =
      await this.householdRepository.findMembershipByUserId(userId);

    if (!membership || membership.role !== 'owner') {
      return;
    }

    const members = await this.householdRepository.findMembersByHouseholdId(
      membership.householdId,
    );
    const otherMembers = members.filter((member) => member.userId !== userId);

    if (otherMembers.length > 0) {
      throw new BadRequestException(
        'Remove household members before deleting the owner account',
      );
    }
  }

  private async deleteHouseholdOrMembership(userId: string): Promise<void> {
    const membership =
      await this.householdRepository.findMembershipByUserId(userId);

    if (!membership) {
      return;
    }

    if (membership.role === 'owner') {
      await this.householdRepository.deleteHouseholdCascade(
        membership.householdId,
      );
      return;
    }

    await this.householdRepository.deleteMembership(
      membership.householdId,
      userId,
    );
  }
}
