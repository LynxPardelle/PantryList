import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  REFRESH_SESSION_DAO,
  JWT_SESSION_SERVICE,
  TOKEN_HASHER,
} from '../tokens';
import { RefreshSessionDao } from '../ports/daos';
import { JwtSessionService } from '../ports/jwt-session.port';
import { TokenHasher } from '../ports/token-hasher.port';
import { RefreshSession } from '../../domain/entities/refresh-session.entity';
import { RefreshSessionId } from '../../domain/value-objects/refresh-session-id.vo';
import { User } from '../../domain/entities/user.entity';

export interface AuthSessionTokens {
  accessToken: string;
  refreshToken: string;
  xsrfToken: string;
  refreshSession: RefreshSession;
}

export interface SessionClientMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuthSessionService {
  constructor(
    @Inject(REFRESH_SESSION_DAO)
    private readonly refreshSessionDao: RefreshSessionDao,
    @Inject(JWT_SESSION_SERVICE)
    private readonly jwtSessionService: JwtSessionService,
    @Inject(TOKEN_HASHER)
    private readonly tokenHasher: TokenHasher,
    private readonly configService: ConfigService,
  ) {}

  async issueForUser(
    user: User,
    metadata?: SessionClientMetadata,
  ): Promise<AuthSessionTokens> {
    const sessionId = RefreshSessionId.generate();
    const refreshExpiresAt = new Date(Date.now() + this.getRefreshTtlMs());
    const refreshToken = await this.jwtSessionService.signRefreshToken(
      user.id.toString(),
      sessionId.toString(),
    );
    const refreshSession = RefreshSession.createWithId(
      sessionId,
      user.id,
      this.tokenHasher.hash(refreshToken),
      refreshExpiresAt,
      metadata,
    );
    const savedSession = await this.refreshSessionDao.save(refreshSession);

    return {
      accessToken: await this.jwtSessionService.signAccessToken(
        user.id.toString(),
        savedSession.id.toString(),
      ),
      refreshToken,
      xsrfToken: this.jwtSessionService.createOpaqueToken(24),
      refreshSession: savedSession,
    };
  }

  async rotate(
    user: User,
    session: RefreshSession,
  ): Promise<AuthSessionTokens> {
    const refreshExpiresAt = new Date(Date.now() + this.getRefreshTtlMs());
    const refreshToken = await this.jwtSessionService.signRefreshToken(
      user.id.toString(),
      session.id.toString(),
    );
    session.rotate(this.tokenHasher.hash(refreshToken), refreshExpiresAt);
    const savedSession = await this.refreshSessionDao.save(session);

    return {
      accessToken: await this.jwtSessionService.signAccessToken(
        user.id.toString(),
        savedSession.id.toString(),
      ),
      refreshToken,
      xsrfToken: this.jwtSessionService.createOpaqueToken(24),
      refreshSession: savedSession,
    };
  }

  private getRefreshTtlMs(): number {
    return (
      Number(
        this.configService.get<string>('JWT_REFRESH_TTL_SECONDS') ?? '2592000',
      ) * 1000
    );
  }
}
