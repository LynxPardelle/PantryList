import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as request from 'supertest';
import {
  ApiMetricsService,
  ApiMetricsSnapshot,
} from '../src/application/services/api-metrics.service';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { configureApp } from '../src/app.setup';

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              API_PREFIX: 'api',
              CORS_ORIGIN: 'http://localhost:4200',
              HELMET_ENABLED: 'false',
              METRICS_ACCESS_TOKEN: 'test-metrics-token',
              SWAGGER_ENABLED: 'false',
            }),
          ],
        }),
      ],
      controllers: [AppController],
      providers: [AppService, ApiMetricsService],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await configureApp(app, app.get(ConfigService));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api (GET)', () => {
    return request(app.getHttpServer()).get('/api').expect(200).expect({
      status: 'ok',
      service: 'despensalista-backend',
    });
  });

  it('/api/healthz (GET)', () => {
    return request(app.getHttpServer()).get('/api/healthz').expect(200).expect({
      status: 'ok',
      service: 'despensalista-backend',
    });
  });

  it('/api/metrics (GET)', async () => {
    await request(app.getHttpServer()).get('/api/healthz').expect(200);

    await request(app.getHttpServer())
      .get('/api/metrics')
      .set('X-Metrics-Token', 'test-metrics-token')
      .expect(200)
      .expect((response) => {
        const body = response.body as ApiMetricsSnapshot;
        expect(body.service).toBe('despensalista-backend');
        expect(body.totalRequests).toBeGreaterThanOrEqual(1);
        expect(body.routes).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              method: 'GET',
              route: '/api/healthz',
            }),
          ]),
        );
      });
  });
});
