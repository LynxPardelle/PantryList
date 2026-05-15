import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { configureApp } from './app.setup';

describe('configureApp hardening', () => {
  it('registers API rate limiting by default', async () => {
    const app = makeApp();
    const configService = makeConfigService({
      API_PREFIX: 'api',
      CORS_ORIGIN: 'http://localhost:4200',
      HELMET_ENABLED: 'true',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX: 120,
      RATE_LIMIT_TIME_WINDOW: '1 minute',
    });

    await configureApp(app, configService);

    expect(app.register).toHaveBeenCalledTimes(3);
  });

  it('uses the first forwarded address as rate-limit key only when trusted proxy mode is enabled', async () => {
    const app = makeApp();
    const configService = makeConfigService({
      API_PREFIX: 'api',
      CORS_ORIGIN: 'http://localhost:4200',
      HELMET_ENABLED: 'true',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_MAX: 120,
      RATE_LIMIT_TIME_WINDOW: '1 minute',
      RATE_LIMIT_TRUST_PROXY: 'true',
    });

    await configureApp(app, configService);

    const rateLimitOptions = (app.register as jest.Mock).mock.calls[1][1] as {
      keyGenerator: (request: {
        ip: string;
        headers: Record<string, string>;
      }) => string;
    };
    expect(
      rateLimitOptions.keyGenerator({
        ip: '10.0.0.25',
        headers: {
          'x-forwarded-for': '203.0.113.10, 10.0.0.25',
        },
      }),
    ).toBe('203.0.113.10');
  });
});

function makeApp(): NestFastifyApplication {
  return {
    setGlobalPrefix: jest.fn(),
    enableCors: jest.fn(),
    register: jest.fn().mockResolvedValue(undefined),
    useGlobalPipes: jest.fn(),
  } as unknown as NestFastifyApplication;
}

function makeConfigService(values: Record<string, unknown>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
