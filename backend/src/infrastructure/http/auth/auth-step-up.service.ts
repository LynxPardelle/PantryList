import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from './authenticated-user.interface';

export interface AuthStepUpStatus {
  enabled: boolean;
  maxAgeSeconds: number;
  fresh: boolean;
  authenticatedAt?: Date;
  freshUntil?: Date;
}

@Injectable()
export class AuthStepUpService {
  constructor(private readonly configService: ConfigService) {}

  getStatus(currentUser: AuthenticatedUser): AuthStepUpStatus {
    const enabled =
      this.configService.get<string>('AUTH_STEP_UP_ENABLED') === 'true';
    const maxAgeSeconds = this.getMaxAgeSeconds();
    const authenticatedAt = currentUser.authenticatedAt;
    const freshUntil = authenticatedAt
      ? new Date(authenticatedAt.getTime() + maxAgeSeconds * 1000)
      : undefined;
    const fresh = !enabled || Boolean(freshUntil && freshUntil > new Date());

    return {
      enabled,
      maxAgeSeconds,
      fresh,
      authenticatedAt,
      freshUntil,
    };
  }

  assertFreshAuthentication(
    currentUser: AuthenticatedUser,
    action: string,
  ): void {
    const status = this.getStatus(currentUser);

    if (!status.enabled || status.fresh) {
      return;
    }

    throw new UnauthorizedException(
      `${action} requires a recent Cognito login`,
    );
  }

  private getMaxAgeSeconds(): number {
    const value = Number(
      this.configService.get<string | number>('AUTH_STEP_UP_MAX_AGE_SECONDS') ??
        900,
    );

    return Number.isInteger(value) && value > 0 ? value : 900;
  }
}
