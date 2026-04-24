import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  JWT_SESSION_SERVICE,
  REFRESH_SESSION_DAO,
  TOKEN_HASHER,
  USER_DAO,
} from '../tokens';
import { JwtSessionService } from '../ports/jwt-session.port';
import { RefreshSessionDao, UserDao } from '../ports/daos';
import { TokenHasher } from '../ports/token-hasher.port';
import { AuthSessionResult } from './auth-session-result';
import { AuthSessionService } from '../services/auth-session.service';
import { RefreshSessionId } from '../../domain/value-objects/refresh-session-id.vo';
import { UserAccountStatus } from '../../domain/enums';

@Injectable()
export class RefreshAuthSessionUseCase {
  constructor(
    @Inject(JWT_SESSION_SERVICE)
    private readonly jwtSessionService: JwtSessionService,
    @Inject(REFRESH_SESSION_DAO)
    private readonly refreshSessionDao: RefreshSessionDao,
    @Inject(TOKEN_HASHER)
    private readonly tokenHasher: TokenHasher,
    @Inject(USER_DAO)
    private readonly userDao: UserDao,
    private readonly authSessionService: AuthSessionService,
  ) {}

  async execute(refreshToken: string): Promise<AuthSessionResult> {
    const claims =
      await this.jwtSessionService.verifyRefreshToken(refreshToken);
    const session = await this.refreshSessionDao.findById(
      RefreshSessionId.fromString(claims.sid),
    );

    if (
      !session ||
      session.userId.toString() !== claims.sub ||
      session.isRevoked() ||
      session.isExpired() ||
      session.refreshTokenHash !== this.tokenHasher.hash(refreshToken)
    ) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    const user = await this.userDao.findById(session.userId);

    if (!user || user.status !== UserAccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh session');
    }

    return {
      user,
      session: await this.authSessionService.rotate(user, session),
    };
  }
}
