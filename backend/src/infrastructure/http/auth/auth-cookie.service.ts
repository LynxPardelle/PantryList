import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthSessionTokens } from '../../../application/services/auth-session.service';

@Injectable()
export class AuthCookieService {
  readonly accessCookieName = 'pantrylist_access_token';
  readonly refreshCookieName = 'pantrylist_refresh_token';
  readonly xsrfCookieName = 'XSRF-TOKEN';
  readonly xsrfHeaderName = 'x-xsrf-token';

  constructor(private readonly configService: ConfigService) {}

  setSessionCookies(reply: FastifyReply, session: AuthSessionTokens): void {
    reply.setCookie(this.accessCookieName, session.accessToken, {
      ...this.getBaseCookieOptions(),
      httpOnly: true,
      maxAge: this.getAccessCookieMaxAgeSeconds(),
      path: '/',
    });
    reply.setCookie(this.refreshCookieName, session.refreshToken, {
      ...this.getBaseCookieOptions(),
      httpOnly: true,
      maxAge: this.getRefreshCookieMaxAgeSeconds(),
      path: '/api/auth',
    });
    reply.setCookie(this.xsrfCookieName, session.xsrfToken, {
      ...this.getBaseCookieOptions(),
      httpOnly: false,
      maxAge: this.getRefreshCookieMaxAgeSeconds(),
      path: '/',
    });
  }

  clearSessionCookies(reply: FastifyReply): void {
    reply.clearCookie(this.accessCookieName, {
      path: '/',
      domain: this.getCookieDomain(),
    });
    reply.clearCookie(this.refreshCookieName, {
      path: '/api/auth',
      domain: this.getCookieDomain(),
    });
    reply.clearCookie(this.xsrfCookieName, {
      path: '/',
      domain: this.getCookieDomain(),
    });
  }

  getRefreshTokenFromRequest(request: FastifyRequest): string | undefined {
    return request.cookies?.[this.refreshCookieName];
  }

  getAccessTokenFromRequest(request: FastifyRequest): string | undefined {
    return request.cookies?.[this.accessCookieName];
  }

  ensureXsrfForRequest(request: FastifyRequest): void {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
      return;
    }

    const cookieValue = request.cookies?.[this.xsrfCookieName];
    const headerValue = request.headers[this.xsrfHeaderName] as
      | string
      | undefined;

    if (!cookieValue || !headerValue || cookieValue !== headerValue) {
      throw new UnauthorizedException('Invalid XSRF token');
    }
  }

  private getBaseCookieOptions(): {
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    domain?: string;
  } {
    return {
      secure: this.getCookieSecure(),
      sameSite: this.getCookieSameSite(),
      domain: this.getCookieDomain(),
    };
  }

  private getCookieSecure(): boolean {
    const configuredSecure =
      this.configService.get<string>('AUTH_COOKIE_SECURE');

    if (configuredSecure) {
      return configuredSecure === 'true';
    }

    return (
      (this.configService.get<string>('NODE_ENV') ?? 'development') ===
      'production'
    );
  }

  private getCookieSameSite(): 'lax' | 'strict' | 'none' {
    const configuredSameSite = (
      this.configService.get<string>('AUTH_COOKIE_SAME_SITE') ?? 'lax'
    ).toLowerCase();

    if (
      configuredSameSite === 'lax' ||
      configuredSameSite === 'strict' ||
      configuredSameSite === 'none'
    ) {
      return configuredSameSite;
    }

    return 'lax';
  }

  private getCookieDomain(): string | undefined {
    return this.configService.get<string>('AUTH_COOKIE_DOMAIN') || undefined;
  }

  private getAccessCookieMaxAgeSeconds(): number {
    return Number(
      this.configService.get<string>('JWT_ACCESS_TTL_SECONDS') ?? '900',
    );
  }

  private getRefreshCookieMaxAgeSeconds(): number {
    return Number(
      this.configService.get<string>('JWT_REFRESH_TTL_SECONDS') ?? '2592000',
    );
  }
}
