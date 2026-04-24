import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PASSWORD_CREDENTIAL_DAO, PASSWORD_HASHER, USER_DAO } from '../tokens';
import { PasswordCredentialDao, UserDao } from '../ports/daos';
import { PasswordHasher } from '../ports/password-hasher.port';
import { AuthSessionResult } from './auth-session-result';
import {
  AuthSessionService,
  SessionClientMetadata,
} from '../services/auth-session.service';
import { PasswordCredential } from '../../domain/entities/password-credential.entity';
import { User } from '../../domain/entities/user.entity';
import { assertStrongPassword } from '../utils/password-policy';

export interface RegisterUserCommand extends SessionClientMetadata {
  email: string;
  username: string;
  password: string;
}

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    @Inject(PASSWORD_CREDENTIAL_DAO)
    private readonly passwordCredentialDao: PasswordCredentialDao,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthSessionResult> {
    assertStrongPassword(command.password);

    const [existingUserByEmail, existingUserByUsername] = await Promise.all([
      this.userDao.findByEmail(command.email),
      this.userDao.findByUsername(command.username),
    ]);

    if (existingUserByEmail) {
      throw new ConflictException('Email is already in use');
    }

    if (existingUserByUsername) {
      throw new ConflictException('Username is already in use');
    }

    const user = await this.userDao.save(
      User.create(command.email, command.username),
    );
    const passwordHash = await this.passwordHasher.hash(command.password);
    await this.passwordCredentialDao.save(
      PasswordCredential.create(user.id, passwordHash),
    );

    return {
      user,
      session: await this.authSessionService.issueForUser(user, command),
    };
  }
}
