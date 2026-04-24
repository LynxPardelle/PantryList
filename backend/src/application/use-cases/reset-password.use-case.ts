import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  PASSWORD_CREDENTIAL_DAO,
  PASSWORD_HASHER,
  PASSWORD_RESET_TOKEN_DAO,
  REFRESH_SESSION_DAO,
  TOKEN_HASHER,
} from '../tokens';
import {
  PasswordCredentialDao,
  PasswordResetTokenDao,
  RefreshSessionDao,
} from '../ports/daos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenHasher } from '../ports/token-hasher.port';
import { assertStrongPassword } from '../utils/password-policy';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @Inject(PASSWORD_RESET_TOKEN_DAO)
    private readonly passwordResetTokenDao: PasswordResetTokenDao,
    @Inject(PASSWORD_CREDENTIAL_DAO)
    private readonly passwordCredentialDao: PasswordCredentialDao,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_HASHER)
    private readonly tokenHasher: TokenHasher,
    @Inject(REFRESH_SESSION_DAO)
    private readonly refreshSessionDao: RefreshSessionDao,
  ) {}

  async execute(token: string, password: string): Promise<void> {
    assertStrongPassword(password);

    const persistedResetToken =
      await this.passwordResetTokenDao.findByTokenHash(
        this.tokenHasher.hash(token),
      );

    if (
      !persistedResetToken ||
      persistedResetToken.isUsed() ||
      persistedResetToken.isExpired()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const credential = await this.passwordCredentialDao.findByUserId(
      persistedResetToken.userId,
    );

    if (!credential) {
      throw new BadRequestException('Password credential not found');
    }

    credential.rotatePassword(await this.passwordHasher.hash(password));
    persistedResetToken.markAsUsed();

    await this.passwordCredentialDao.save(credential);
    await this.passwordResetTokenDao.save(persistedResetToken);
    await this.refreshSessionDao.revokeByUserId(persistedResetToken.userId);
  }
}
