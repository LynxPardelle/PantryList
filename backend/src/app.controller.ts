import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiHealthResponse } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRootStatus(): ApiHealthResponse {
    return this.appService.getRootStatus();
  }

  @Get('healthz')
  getHealthz(): ApiHealthResponse {
    return this.appService.getHealthz();
  }
}
