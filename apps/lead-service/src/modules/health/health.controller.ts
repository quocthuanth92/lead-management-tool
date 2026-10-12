import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponseModel } from '../../common/openapi/openapi.models';
import { HealthService } from './health.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Database and Redis health status', type: HealthResponseModel })
  @ApiResponse({ status: 503, description: 'MongoDB is unavailable' })
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
