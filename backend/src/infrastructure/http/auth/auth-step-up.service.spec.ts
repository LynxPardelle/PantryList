import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthStepUpService } from './auth-step-up.service';

describe('AuthStepUpService', () => {
  it('does not block destructive actions when step-up is disabled', () => {
    const service = new AuthStepUpService(makeConfigService({}));

    expect(() =>
      service.assertFreshAuthentication(
        { userId: 'user-1', authSubjectId: 'auth-1' },
        'Deleting account',
      ),
    ).not.toThrow();
  });

  it('requires a fresh login when step-up is enabled', () => {
    const service = new AuthStepUpService(
      makeConfigService({
        AUTH_STEP_UP_ENABLED: 'true',
        AUTH_STEP_UP_MAX_AGE_SECONDS: '900',
      }),
    );

    expect(() =>
      service.assertFreshAuthentication(
        {
          userId: 'user-1',
          authSubjectId: 'auth-1',
          authenticatedAt: new Date('2020-01-01T00:00:00.000Z'),
        },
        'Deleting account',
      ),
    ).toThrow(UnauthorizedException);
  });
});

function makeConfigService(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
