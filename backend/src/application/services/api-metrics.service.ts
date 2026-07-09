import { Injectable } from '@nestjs/common';

export interface ApiMetricsRecord {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

export interface ApiMetricsRouteSnapshot {
  method: string;
  route: string;
  requestCount: number;
  errorCount: number;
  averageDurationMs: number;
  maxDurationMs: number;
  statusCounts: Record<string, number>;
}

export interface ApiMetricsSnapshot {
  service: 'despensalista-backend';
  startedAt: string;
  generatedAt: string;
  uptimeSeconds: number;
  totalRequests: number;
  errorRequests: number;
  slowRequests: number;
  averageDurationMs: number;
  maxDurationMs: number;
  errorRate: number;
  slowRequestThresholdMs: number;
  errorRateAlertThreshold: number;
  alerts: string[];
  routes: ApiMetricsRouteSnapshot[];
}

interface RouteMetrics {
  method: string;
  route: string;
  requestCount: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  statusCounts: Map<number, number>;
}

@Injectable()
export class ApiMetricsService {
  private readonly startedAt = new Date();
  private readonly routes = new Map<string, RouteMetrics>();
  private totalRequests = 0;
  private errorRequests = 0;
  private slowRequests = 0;
  private totalDurationMs = 0;
  private maxDurationMs = 0;
  private slowRequestThresholdMs = 1000;
  private errorRateAlertThreshold = 0.05;
  private maxRoutes = 50;

  configure(options: {
    slowRequestThresholdMs?: number;
    errorRateAlertThreshold?: number;
    maxRoutes?: number;
  }): void {
    if (
      options.slowRequestThresholdMs !== undefined &&
      Number.isFinite(options.slowRequestThresholdMs) &&
      options.slowRequestThresholdMs > 0
    ) {
      this.slowRequestThresholdMs = options.slowRequestThresholdMs;
    }

    if (
      options.errorRateAlertThreshold !== undefined &&
      Number.isFinite(options.errorRateAlertThreshold) &&
      options.errorRateAlertThreshold >= 0 &&
      options.errorRateAlertThreshold <= 1
    ) {
      this.errorRateAlertThreshold = options.errorRateAlertThreshold;
    }

    if (
      options.maxRoutes !== undefined &&
      Number.isInteger(options.maxRoutes) &&
      options.maxRoutes > 0
    ) {
      this.maxRoutes = options.maxRoutes;
      this.pruneRoutes();
    }
  }

  record(record: ApiMetricsRecord): void {
    const durationMs = Math.max(0, Math.round(record.durationMs));
    const isError = record.statusCode >= 500;
    const routeKey = `${record.method.toUpperCase()} ${record.route}`;
    const routeMetrics =
      this.routes.get(routeKey) ??
      (this.routes.size < this.maxRoutes
        ? createRouteMetrics(record.method.toUpperCase(), record.route)
        : undefined);

    this.totalRequests += 1;
    this.totalDurationMs += durationMs;
    this.maxDurationMs = Math.max(this.maxDurationMs, durationMs);

    if (isError) {
      this.errorRequests += 1;
      if (routeMetrics) {
        routeMetrics.errorCount += 1;
      }
    }

    if (durationMs >= this.slowRequestThresholdMs) {
      this.slowRequests += 1;
    }

    if (routeMetrics) {
      routeMetrics.requestCount += 1;
      routeMetrics.totalDurationMs += durationMs;
      routeMetrics.maxDurationMs = Math.max(
        routeMetrics.maxDurationMs,
        durationMs,
      );
      routeMetrics.statusCounts.set(
        record.statusCode,
        (routeMetrics.statusCounts.get(record.statusCode) ?? 0) + 1,
      );
      this.routes.set(routeKey, routeMetrics);
    }
  }

  getSnapshot(referenceDate = new Date()): ApiMetricsSnapshot {
    const averageDurationMs =
      this.totalRequests === 0
        ? 0
        : roundMetric(this.totalDurationMs / this.totalRequests);
    const errorRate =
      this.totalRequests === 0
        ? 0
        : roundMetric(this.errorRequests / this.totalRequests);
    const alerts = this.buildAlerts(errorRate);

    return {
      service: 'despensalista-backend',
      startedAt: this.startedAt.toISOString(),
      generatedAt: referenceDate.toISOString(),
      uptimeSeconds: Math.max(
        0,
        Math.floor((referenceDate.getTime() - this.startedAt.getTime()) / 1000),
      ),
      totalRequests: this.totalRequests,
      errorRequests: this.errorRequests,
      slowRequests: this.slowRequests,
      averageDurationMs,
      maxDurationMs: this.maxDurationMs,
      errorRate,
      slowRequestThresholdMs: this.slowRequestThresholdMs,
      errorRateAlertThreshold: this.errorRateAlertThreshold,
      alerts,
      routes: Array.from(this.routes.values())
        .sort((left, right) => right.requestCount - left.requestCount)
        .slice(0, this.maxRoutes)
        .map(toRouteSnapshot),
    };
  }

  private buildAlerts(errorRate: number): string[] {
    const alerts: string[] = [];

    if (this.errorRequests > 0 && errorRate >= this.errorRateAlertThreshold) {
      alerts.push('error_rate_threshold_exceeded');
    }

    if (this.slowRequests > 0) {
      alerts.push('slow_requests_observed');
    }

    return alerts;
  }

  private pruneRoutes(): void {
    while (this.routes.size > this.maxRoutes) {
      const oldestRouteKey = this.routes.keys().next().value as
        | string
        | undefined;
      if (!oldestRouteKey) {
        return;
      }

      this.routes.delete(oldestRouteKey);
    }
  }
}

function createRouteMetrics(method: string, route: string): RouteMetrics {
  return {
    method,
    route,
    requestCount: 0,
    errorCount: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    statusCounts: new Map<number, number>(),
  };
}

function toRouteSnapshot(metrics: RouteMetrics): ApiMetricsRouteSnapshot {
  return {
    method: metrics.method,
    route: metrics.route,
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    averageDurationMs: roundMetric(
      metrics.totalDurationMs / metrics.requestCount,
    ),
    maxDurationMs: metrics.maxDurationMs,
    statusCounts: Object.fromEntries(
      Array.from(metrics.statusCounts.entries()).map(([status, count]) => [
        String(status),
        count,
      ]),
    ),
  };
}

function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}
