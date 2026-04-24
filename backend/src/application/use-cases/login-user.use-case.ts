import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PASSWORD_CREDENTIAL_DAO, PASSWORD_HASHER, USER_DAO } from '../tokens';
import { PasswordCredentialDao, UserDao } from '../ports/daos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { AuthSessionResult } from './auth-session-result';
import {
  AuthSessionService,
  SessionClientMetadata,
} from '../services/auth-session.service';
import { UserAccountStatus } from '../../domain/enums';

export interface LoginUserCommand extends SessionClientMetadata {
  email: string;
  password: string;
}

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    @Inject(PASSWORD_CREDENTIAL_DAO)
    private readonly passwordCredentialDao: PasswordCredentialDao,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthSessionResult> {
    const user = await this.userDao.findByEmail(command.email);
    const credential = user
      ? await this.passwordCredentialDao.findByUserId(user.id)
      : null;

    if (
      !user ||
      user.status !== UserAccountStatus.ACTIVE ||
      !credential ||
      !(await this.passwordHasher.verify(
        credential.passwordHash,
        command.password,
      ))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user,
      session: await this.authSessionService.issueForUser(user, command),
    };
  }
}
