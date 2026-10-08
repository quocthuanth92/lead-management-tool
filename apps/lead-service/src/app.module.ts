import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { ConfigAppModule } from './core/config/config.module';
import { DatabaseModule } from './core/database/database.module';
import { RedisModule } from './core/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { LeadActivitiesModule } from './modules/lead-activities/lead-activities.module';
import { LeadsModule } from './modules/leads/leads.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigAppModule,
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_LIMIT ?? 100)
      }
    ]),
    DatabaseModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    LeadsModule,
    LeadActivitiesModule,
    CacheModule
  ]
})
export class AppModule {}
