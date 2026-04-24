import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the backend status payload', () => {
      expect(appController.getRootStatus()).toEqual({
        status: 'ok',
        service: 'pantrylist-backend',
      });
    });

    it('should expose a healthz payload', () => {
      expect(appController.getHealthz()).toEqual({
        status: 'ok',
        service: 'pantrylist-backend',
      });
    });
  });
});
