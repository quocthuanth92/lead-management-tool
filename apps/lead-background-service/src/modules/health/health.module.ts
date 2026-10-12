import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module';
import { RedisModule } from '../../core/redis/redis.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [DatabaseModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService]
})
export class HealthModule {}
