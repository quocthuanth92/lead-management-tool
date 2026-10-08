import { Module } from '@nestjs/common';

import { ConfigAppModule } from './core/config/config.module';
import { HealthModule } from './modules/health/health.module';
import { LeadConsumerModule } from './modules/lead-consumer/lead-consumer.module';

@Module({
  imports: [ConfigAppModule, HealthModule, LeadConsumerModule]
})
export class AppModule {}
