import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    db: 'up' | 'down';
    redis: 'up' | 'down';
  }> {
    const health = await this.healthService.getHealth();
    if (health.db === 'down') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
