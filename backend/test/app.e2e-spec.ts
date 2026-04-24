import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import * as request from 'supertest';
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
              SWAGGER_ENABLED: 'false',
            }),
          ],
        }),
      ],
      controllers: [AppController],
      providers: [AppService],
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
      service: 'pantrylist-backend',
    });
  });

  it('/api/healthz (GET)', () => {
    return request(app.getHttpServer()).get('/api/healthz').expect(200).expect({
      status: 'ok',
      service: 'pantrylist-backend',
    });
  });
});
