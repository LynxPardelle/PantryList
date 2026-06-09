import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiMetricsSnapshot } from './api-metrics.service';

interface MetricsAlertPayload {
  service: ApiMetricsSnapshot['service'];
  generatedAt: string;
  alerts: string[];
  totalRequests: number;
  errorRequests: number;
  slowRequests: number;
  errorRate: number;
  routes: Array<{
    method: string;
    route: string;
    requestCount: number;
    errorCount: number;
    maxDurationMs: number;
  }>;
}

@Injectable()
export class ApiMetricsAlertSinkService {
  private readonly logger = new Logger(ApiMetricsAlertSinkService.name);
  private lastSentAt = 0;

  constructor(private readonly configService: ConfigService) {}

  reportIfNeeded(snapshot: ApiMetricsSnapshot): void {
    const webhookUrl = this.configService
      .get<string>('METRICS_ALERT_WEBHOOK_URL')
      ?.trim();

    if (!webhookUrl || snapshot.alerts.length === 0) {
      return;
    }

    const minIntervalMs =
      (this.configService.get<number>('METRICS_ALERT_MIN_INTERVAL_SECONDS') ??
        300) * 1000;
    const now = Date.now();

    if (now - this.lastSentAt < minIntervalMs) {
      return;
    }

    this.lastSentAt = now;
    void this.send(webhookUrl, this.toPayload(snapshot));
  }

  private async send(
    webhookUrl: string,
    payload: MetricsAlertPayload,
  ): Promise<void> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        this.logger.warn(`metrics_alert_sink_failed status=${response.status}`);
      }
    } catch {
      this.logger.warn('metrics_alert_sink_failed');
    }
  }

  private toPayload(snapshot: ApiMetricsSnapshot): MetricsAlertPayload {
    return {
      service: snapshot.service,
      generatedAt: snapshot.generatedAt,
      alerts: snapshot.alerts,
      totalRequests: snapshot.totalRequests,
      errorRequests: snapshot.errorRequests,
      slowRequests: snapshot.slowRequests,
      errorRate: snapshot.errorRate,
      routes: snapshot.routes
        .filter((route) => route.errorCount > 0 || route.maxDurationMs > 0)
        .slice(0, 5)
        .map((route) => ({
          method: route.method,
          route: route.route,
          requestCount: route.requestCount,
          errorCount: route.errorCount,
          maxDurationMs: route.maxDurationMs,
        })),
    };
  }
}
