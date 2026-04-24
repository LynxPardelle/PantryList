import { Inject, Injectable } from '@nestjs/common';
import { JWT_SESSION_SERVICE, REFRESH_SESSION_DAO } from '../tokens';
import { JwtSessionService } from '../ports/jwt-session.port';
import { RefreshSessionDao } from '../ports/daos';
import { RefreshSessionId } from '../../domain/value-objects/refresh-session-id.vo';

@Injectable()
export class LogoutUserUseCase {
  constructor(
    @Inject(JWT_SESSION_SERVICE)
    private readonly jwtSessionService: JwtSessionService,
    @Inject(REFRESH_SESSION_DAO)
    private readonly refreshSessionDao: RefreshSessionDao,
  ) {}

  async execute(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const claims =
        await this.jwtSessionService.verifyRefreshToken(refreshToken);
      const session = await this.refreshSessionDao.findById(
        RefreshSessionId.fromString(claims.sid),
      );

      if (!session || session.isRevoked()) {
        return;
      }

      session.revoke();
      await this.refreshSessionDao.save(session);
    } catch {
      return;
    }
  }
}
