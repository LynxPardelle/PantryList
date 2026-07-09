import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiMetricsService } from './application/services/api-metrics.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        ApiMetricsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'METRICS_ACCESS_TOKEN' ? 'metrics-token' : undefined,
            ),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the backend status payload', () => {
      expect(appController.getRootStatus()).toEqual({
        status: 'ok',
        service: 'despensalista-backend',
      });
    });

    it('should expose a healthz payload', () => {
      expect(appController.getHealthz()).toEqual({
        status: 'ok',
        service: 'despensalista-backend',
      });
    });

    it('should expose operational metrics without user data', () => {
      const metrics = appController.getMetrics('metrics-token');

      expect(metrics.service).toBe('despensalista-backend');
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.routes).toEqual([]);
    });

    it('should reject metrics requests without the configured token', () => {
      expect(() => appController.getMetrics('wrong-token')).toThrow(
        UnauthorizedException,
      );
    });

    it('should hide metrics when no token is configured', () => {
      const controller = new AppController(
        new AppService(),
        new ApiMetricsService(),
        { get: jest.fn() } as unknown as ConfigService,
      );

      expect(() => controller.getMetrics()).toThrow(NotFoundException);
    });
  });
});
