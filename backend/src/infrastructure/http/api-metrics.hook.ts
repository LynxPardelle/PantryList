import type { FastifyInstance, FastifyRequest } from 'fastify';
import { ApiMetricsAlertSinkService } from '../../application/services/api-metrics-alert-sink.service';
import { ApiMetricsService } from '../../application/services/api-metrics.service';

const REQUEST_STARTED_AT = Symbol('requestStartedAt');

type MetricsFastifyRequest = FastifyRequest & {
  [REQUEST_STARTED_AT]?: bigint;
};

export function registerApiMetricsHook(
  fastify: FastifyInstance,
  metricsService: ApiMetricsService,
  alertSink?: ApiMetricsAlertSinkService,
): void {
  fastify.addHook(
    'onRequest',
    (request: MetricsFastifyRequest, _reply, done) => {
      request[REQUEST_STARTED_AT] = process.hrtime.bigint();
      done();
    },
  );

  fastify.addHook(
    'onResponse',
    (request: MetricsFastifyRequest, reply, done) => {
      const startedAt = request[REQUEST_STARTED_AT];
      const durationMs = startedAt
        ? Number(process.hrtime.bigint() - startedAt) / 1_000_000
        : 0;

      metricsService.record({
        method: request.method,
        route: getRoutePattern(request),
        statusCode: reply.statusCode,
        durationMs,
      });
      alertSink?.reportIfNeeded(metricsService.getSnapshot());
      done();
    },
  );
}

function getRoutePattern(request: FastifyRequest): string {
  const routeOptions = request.routeOptions as
    | {
        url?: string;
      }
    | undefined;

  return routeOptions?.url ?? stripQueryString(request.url);
}

function stripQueryString(url: string): string {
  return url.split('?')[0] || '/';
}
