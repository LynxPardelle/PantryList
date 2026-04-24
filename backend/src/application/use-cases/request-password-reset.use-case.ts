import { Inject, Injectable } from '@nestjs/common';
import {
  MAIL_SENDER,
  PASSWORD_RESET_TOKEN_DAO,
  TOKEN_HASHER,
  USER_DAO,
  JWT_SESSION_SERVICE,
} from '../tokens';
import { MailSender } from '../ports/mail-sender.port';
import { PasswordResetTokenDao, UserDao } from '../ports/daos';
import { TokenHasher } from '../ports/token-hasher.port';
import { JwtSessionService } from '../ports/jwt-session.port';
import { PasswordResetToken } from '../../domain/entities/password-reset-token.entity';
import { UserAccountStatus } from '../../domain/enums';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    @Inject(PASSWORD_RESET_TOKEN_DAO)
    private readonly passwordResetTokenDao: PasswordResetTokenDao,
    @Inject(TOKEN_HASHER)
    private readonly tokenHasher: TokenHasher,
    @Inject(JWT_SESSION_SERVICE)
    private readonly jwtSessionService: JwtSessionService,
    @Inject(MAIL_SENDER)
    private readonly mailSender: MailSender,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.userDao.findByEmail(email);

    if (!user || user.status !== UserAccountStatus.ACTIVE) {
      return;
    }

    const rawResetToken = this.jwtSessionService.createOpaqueToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
    const passwordResetToken = PasswordResetToken.create(
      user.id,
      this.tokenHasher.hash(rawResetToken),
      expiresAt,
    );

    await this.passwordResetTokenDao.save(passwordResetToken);
    await this.mailSender.sendPasswordResetMail({
      email: user.email,
      username: user.username,
      resetToken: rawResetToken,
      expiresAt,
    });
  }
}
