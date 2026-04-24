import { Injectable } from '@nestjs/common';

export interface ApiHealthResponse {
  status: 'ok';
  service: 'pantrylist-backend';
}

@Injectable()
export class AppService {
  getRootStatus(): ApiHealthResponse {
    return {
      status: 'ok',
      service: 'pantrylist-backend',
    };
  }

  getHealthz(): ApiHealthResponse {
    return this.getRootStatus();
  }
}
