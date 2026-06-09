import { ApiMetricsService } from './api-metrics.service';

describe('ApiMetricsService', () => {
  it('records route metrics and raises threshold alerts', () => {
    const service = new ApiMetricsService();
    service.configure({
      errorRateAlertThreshold: 0.5,
      slowRequestThresholdMs: 100,
    });

    service.record({
      method: 'get',
      route: '/api/pantry/overview',
      statusCode: 200,
      durationMs: 50,
    });
    service.record({
      method: 'GET',
      route: '/api/pantry/overview',
      statusCode: 503,
      durationMs: 150,
    });

    const snapshot = service.getSnapshot(new Date('2026-06-09T18:00:00.000Z'));

    expect(snapshot.totalRequests).toBe(2);
    expect(snapshot.errorRequests).toBe(1);
    expect(snapshot.slowRequests).toBe(1);
    expect(snapshot.errorRate).toBe(0.5);
    expect(snapshot.alerts).toEqual([
      'error_rate_threshold_exceeded',
      'slow_requests_observed',
    ]);
    expect(snapshot.routes).toEqual([
      expect.objectContaining({
        method: 'GET',
        route: '/api/pantry/overview',
        requestCount: 2,
        errorCount: 1,
        statusCounts: {
          '200': 1,
          '503': 1,
        },
      }),
    ]);
  });

  it('caps stored route cardinality while keeping global counters', () => {
    const service = new ApiMetricsService();
    service.configure({ maxRoutes: 1 });

    service.record({
      method: 'GET',
      route: '/api/a',
      statusCode: 200,
      durationMs: 10,
    });
    service.record({
      method: 'GET',
      route: '/api/b',
      statusCode: 200,
      durationMs: 10,
    });
    service.record({
      method: 'GET',
      route: '/api/b',
      statusCode: 200,
      durationMs: 10,
    });

    const snapshot = service.getSnapshot();

    expect(snapshot.totalRequests).toBe(3);
    expect(snapshot.routes).toEqual([
      expect.objectContaining({
        route: '/api/a',
        requestCount: 1,
      }),
    ]);
  });
});
