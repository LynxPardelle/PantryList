import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import type { InjectOptions } from 'light-my-request';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

interface ApiGatewayHttpEvent {
  body?: string;
  cookies?: string[];
  headers?: Record<string, string | undefined>;
  isBase64Encoded?: boolean;
  rawPath?: string;
  rawQueryString?: string;
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
      sourceIp?: string;
    };
  };
}

interface LambdaContext {
  callbackWaitsForEmptyEventLoop?: boolean;
}

interface ApiGatewayHttpResponse {
  body: string;
  cookies?: string[];
  headers: Record<string, string>;
  isBase64Encoded: false;
  statusCode: number;
}

let cachedApp: NestFastifyApplication | undefined;
export async function closeCachedAppForTest(): Promise<void> {
  await cachedApp?.close();
  cachedApp = undefined;
}

export async function handler(
  event: ApiGatewayHttpEvent,
  context?: LambdaContext,
): Promise<ApiGatewayHttpResponse> {
  if (context) {
    context.callbackWaitsForEmptyEventLoop = false;
  }

  const app = await getApp();
  const response = await app
    .getHttpAdapter()
    .getInstance()
    .inject(toInjectOptions(event));

  return toApiGatewayResponse(response);
}

async function getApp(): Promise<NestFastifyApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ['error', 'warn', 'log'] },
  );
  const configService = app.get(ConfigService);
  await configureApp(app, configService);
  await app.init();
  cachedApp = app;

  return cachedApp;
}

function toInjectOptions(event: ApiGatewayHttpEvent): InjectOptions {
  const path = event.rawPath ?? event.requestContext?.http?.path ?? '/';
  const query = event.rawQueryString ? `?${event.rawQueryString}` : '';

  return {
    method: toHttpMethod(event.requestContext?.http?.method),
    url: `${path}${query}`,
    headers: toHeaders(event),
    body: decodeBody(event),
    remoteAddress: event.requestContext?.http?.sourceIp,
  };
}

function toHttpMethod(method: string | undefined): InjectOptions['method'] {
  switch (method?.toUpperCase()) {
    case 'DELETE':
      return 'DELETE';
    case 'HEAD':
      return 'HEAD';
    case 'OPTIONS':
      return 'OPTIONS';
    case 'PATCH':
      return 'PATCH';
    case 'POST':
      return 'POST';
    case 'PUT':
      return 'PUT';
    default:
      return 'GET';
  }
}

function toHeaders(event: ApiGatewayHttpEvent): Record<string, string> {
  const headers = Object.entries(event.headers ?? {}).reduce<
    Record<string, string>
  >((current, [key, value]) => {
    if (value !== undefined) {
      current[key] = value;
    }

    return current;
  }, {});

  if (event.cookies?.length) {
    const cookieHeader = event.cookies.join('; ');
    headers.cookie = headers.cookie
      ? `${headers.cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return headers;
}

function decodeBody(event: ApiGatewayHttpEvent): string | undefined {
  if (!event.body) {
    return undefined;
  }

  // ponytail: text payload adapter; add binary handling when uploads move here.
  return event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
}

function toApiGatewayResponse(response: {
  body: string;
  headers: Record<string, number | string | string[] | undefined>;
  statusCode: number;
}): ApiGatewayHttpResponse {
  const headers: Record<string, string> = {};
  const cookies: string[] = [];

  for (const [key, value] of Object.entries(response.headers)) {
    if (value === undefined) {
      continue;
    }

    if (key.toLowerCase() === 'set-cookie') {
      cookies.push(...(Array.isArray(value) ? value : [String(value)]));
      continue;
    }

    headers[key] = Array.isArray(value) ? value.join(',') : String(value);
  }

  return {
    statusCode: response.statusCode,
    headers,
    cookies: cookies.length ? cookies : undefined,
    body: response.body,
    isBase64Encoded: false,
  };
}
