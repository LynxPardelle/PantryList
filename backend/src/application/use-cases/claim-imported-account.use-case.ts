import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  INVENTORY_LOT_REPOSITORY,
  LEGACY_ACCOUNT_CLAIM_DAO,
  PASSWORD_CREDENTIAL_DAO,
  PASSWORD_HASHER,
  PRODUCT_REPOSITORY,
  PRODUCT_TYPE_REPOSITORY,
  USER_DAO,
} from '../tokens';
import {
  LegacyAccountClaimDao,
  PasswordCredentialDao,
  UserDao,
} from '../ports/daos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { AuthSessionResult } from './auth-session-result';
import {
  AuthSessionService,
  SessionClientMetadata,
} from '../services/auth-session.service';
import { PasswordCredential } from '../../domain/entities/password-credential.entity';
import { LegacyAccountClaim } from '../../domain/entities/legacy-account-claim.entity';
import { User } from '../../domain/entities/user.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { ProductTypeRepository } from '../../domain/repositories/product-type.repository';
import { InventoryLotRepository } from '../../domain/repositories/inventory-lot.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { assertStrongPassword } from '../utils/password-policy';
import { LegacyAccountClaimStatus } from '../../domain/enums';

export interface ClaimImportedAccountCommand extends SessionClientMetadata {
  legacyUsername: string;
  email: string;
  password: string;
  finalUsername?: string;
}

@Injectable()
export class ClaimImportedAccountUseCase {
  constructor(
    @Inject(LEGACY_ACCOUNT_CLAIM_DAO)
    private readonly legacyAccountClaimDao: LegacyAccountClaimDao,
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    @Inject(PASSWORD_CREDENTIAL_DAO)
    private readonly passwordCredentialDao: PasswordCredentialDao,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
    @Inject(PRODUCT_TYPE_REPOSITORY)
    private readonly productTypeRepository: ProductTypeRepository,
    @Inject(INVENTORY_LOT_REPOSITORY)
    private readonly inventoryLotRepository: InventoryLotRepository,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async execute(
    command: ClaimImportedAccountCommand,
  ): Promise<AuthSessionResult> {
    assertStrongPassword(command.password);

    const claim = await this.legacyAccountClaimDao.findByLegacyUsername(
      command.legacyUsername,
    );

    if (!claim) {
      throw new NotFoundException('Legacy account claim not found');
    }

    const finalUsername = command.finalUsername?.trim() || claim.legacyUsername;

    if (claim.status === LegacyAccountClaimStatus.CLAIMING) {
      return this.resumeClaimingAttempt(claim, finalUsername, command);
    }

    if (claim.status !== LegacyAccountClaimStatus.UNCLAIMED) {
      throw new NotFoundException('Legacy account claim not found');
    }

    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.userDao.findByEmail(command.email),
      this.userDao.findByUsername(finalUsername),
    ]);

    if (existingUserByEmail) {
      throw new ConflictException('Email is already in use');
    }

    if (existingUserByUsername) {
      throw new ConflictException('Username is already in use');
    }

    claim.markClaiming();
    await this.legacyAccountClaimDao.save(claim);

    const user = await this.userDao.save(
      User.create(command.email, finalUsername),
    );
    await this.ensurePasswordCredential(user, command.password);

    await this.reassignLegacyOwnership(claim.legacyUsername, user.id);

    claim.markClaimed(user.id);
    await this.legacyAccountClaimDao.save(claim);

    return {
      user,
      session: await this.authSessionService.issueForUser(user, command),
    };
  }

  private async resumeClaimingAttempt(
    claim: LegacyAccountClaim,
    finalUsername: string,
    command: ClaimImportedAccountCommand,
  ): Promise<AuthSessionResult> {
    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.userDao.findByEmail(command.email),
      this.userDao.findByUsername(finalUsername),
    ]);

    if (
      !existingUserByEmail ||
      !existingUserByUsername ||
      existingUserByEmail.id.toString() !== existingUserByUsername.id.toString()
    ) {
      throw new ConflictException(
        'Legacy account claim is already in progress',
      );
    }

    const existingCredential = await this.passwordCredentialDao.findByUserId(
      existingUserByEmail.id,
    );

    if (existingCredential) {
      const passwordMatches = await this.passwordHasher.verify(
        existingCredential.passwordHash,
        command.password,
      );

      if (!passwordMatches) {
        throw new ConflictException(
          'Legacy account claim could not be resumed safely',
        );
      }
    } else {
      throw new ConflictException(
        'Legacy account claim could not be resumed safely',
      );
    }

    await this.reassignLegacyOwnership(
      claim.legacyUsername,
      existingUserByEmail.id,
    );

    claim.markClaimed(existingUserByEmail.id);
    await this.legacyAccountClaimDao.save(claim);

    return {
      user: existingUserByEmail,
      session: await this.authSessionService.issueForUser(
        existingUserByEmail,
        command,
      ),
    };
  }

  private async ensurePasswordCredential(
    user: User,
    password: string,
  ): Promise<void> {
    await this.passwordCredentialDao.save(
      PasswordCredential.create(
        user.id,
        await this.passwordHasher.hash(password),
      ),
    );
  }

  private async reassignLegacyOwnership(
    legacyUsername: string,
    userId: UserId,
  ): Promise<void> {
    const legacyOwnerId = UserId.fromString(legacyUsername);
    await Promise.all([
      this.productRepository.reassignUserOwnership(legacyOwnerId, userId),
      this.productTypeRepository.reassignUserOwnership(legacyOwnerId, userId),
      this.inventoryLotRepository.reassignUserOwnership(legacyOwnerId, userId),
    ]);
  }
}
