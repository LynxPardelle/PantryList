import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export async function configureApp(
  app: NestFastifyApplication,
  configService: ConfigService,
): Promise<void> {
  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  const corsOrigin = parseCorsOrigins(
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:4200',
  );
  const helmetEnabled = configService.get<string>('HELMET_ENABLED') !== 'false';
  const swaggerEnabled =
    configService.get<string>('SWAGGER_ENABLED') === 'true';

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({ origin: corsOrigin, credentials: true });
  await app.register(fastifyCookie);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (helmetEnabled) {
    await app.register(fastifyHelmet);
  }

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(configService.get<string>('SWAGGER_TITLE') ?? 'PantryList API')
      .setDescription(
        configService.get<string>('SWAGGER_DESCRIPTION') ??
          'PantryList API documentation',
      )
      .setVersion(configService.get<string>('SWAGGER_VERSION') ?? '1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }
}

function parseCorsOrigins(corsOrigin: string): string[] {
  return corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
