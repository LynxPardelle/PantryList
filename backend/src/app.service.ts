import { Injectable } from '@nestjs/common';

export interface ApiHealthResponse {
  status: 'ok';
  service: 'despensalista-backend';
}

@Injectable()
export class AppService {
  getRootStatus(): ApiHealthResponse {
    return {
      status: 'ok',
      service: 'despensalista-backend',
    };
  }

  getHealthz(): ApiHealthResponse {
    return this.getRootStatus();
  }
}
