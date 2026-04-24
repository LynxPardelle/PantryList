import { randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  JwtSessionClaims,
  JwtSessionService,
} from '../../application/ports/jwt-session.port';

@Injectable()
export class NestJwtSessionService implements JwtSessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(userId: string, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        type: 'access',
      },
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessTtlSeconds(),
      },
    );
  }

  async signRefreshToken(userId: string, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        type: 'refresh',
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshTtlSeconds(),
      },
    );
  }

  async verifyAccessToken(token: string): Promise<JwtSessionClaims> {
    return this.verify(token, this.getAccessSecret(), 'access');
  }

  async verifyRefreshToken(token: string): Promise<JwtSessionClaims> {
    return this.verify(token, this.getRefreshSecret(), 'refresh');
  }

  createOpaqueToken(byteLength = 32): string {
    return randomBytes(byteLength).toString('base64url');
  }

  private async verify(
    token: string,
    secret: string,
    expectedType: 'access' | 'refresh',
  ): Promise<JwtSessionClaims> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtSessionClaims>(
        token,
        {
          secret,
        },
      );

      if (payload.type !== expectedType) {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid session token');
    }
  }

  private getAccessSecret(): string {
    return this.getRequiredSecret(
      'JWT_ACCESS_SECRET',
      'pantrylist-dev-access-secret',
    );
  }

  private getRefreshSecret(): string {
    return this.getRequiredSecret(
      'JWT_REFRESH_SECRET',
      'pantrylist-dev-refresh-secret',
    );
  }

  private getAccessTtlSeconds(): number {
    return Number(
      this.configService.get<string>('JWT_ACCESS_TTL_SECONDS') ?? '900',
    );
  }

  private getRefreshTtlSeconds(): number {
    return Number(
      this.configService.get<string>('JWT_REFRESH_TTL_SECONDS') ?? '2592000',
    );
  }

  private getRequiredSecret(key: string, developmentFallback: string): string {
    const configuredSecret = this.configService.get<string>(key);

    if (configuredSecret) {
      return configuredSecret;
    }

    if (
      (this.configService.get<string>('NODE_ENV') ?? 'development') ===
      'production'
    ) {
      throw new Error(`${key} must be configured in production`);
    }

    return developmentFallback;
  }
}
