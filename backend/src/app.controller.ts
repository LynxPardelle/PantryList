import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import {
  ApiMetricsService,
  ApiMetricsSnapshot,
} from './application/services/api-metrics.service';
import { AppService } from './app.service';
import { ApiHealthResponse } from './app.service';

@Controller()
export class AppController {
  private readonly metricsAccessToken: string;

  constructor(
    private readonly appService: AppService,
    private readonly apiMetricsService: ApiMetricsService,
    configService: ConfigService,
  ) {
    this.metricsAccessToken =
      configService.get<string>('METRICS_ACCESS_TOKEN')?.trim() ?? '';
  }

  @Get()
  getRootStatus(): ApiHealthResponse {
    return this.appService.getRootStatus();
  }

  @Get('healthz')
  getHealthz(): ApiHealthResponse {
    return this.appService.getHealthz();
  }

  @Get('metrics')
  getMetrics(
    @Headers('x-metrics-token') metricsToken?: string | string[],
    @Headers('authorization') authorization?: string | string[],
  ): ApiMetricsSnapshot {
    if (!this.metricsAccessToken) {
      throw new NotFoundException();
    }

    const providedToken =
      getSingleHeader(metricsToken) ?? getBearerToken(authorization);
    if (
      !providedToken ||
      !timingSafeTokenEquals(this.metricsAccessToken, providedToken)
    ) {
      throw new UnauthorizedException();
    }

    return this.apiMetricsService.getSnapshot();
  }
}

function getSingleHeader(header?: string | string[]): string | undefined {
  return Array.isArray(header) ? header[0] : header;
}

function getBearerToken(header?: string | string[]): string | undefined {
  const value = getSingleHeader(header);
  if (!value?.startsWith('Bearer ')) {
    return undefined;
  }

  return value.slice('Bearer '.length).trim();
}

function timingSafeTokenEquals(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
