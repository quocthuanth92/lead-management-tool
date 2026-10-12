import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { ConfigAppModule } from './core/config/config.module';
import { HealthModule } from './modules/health/health.module';
import { LeadAssignmentModule } from './modules/lead-assignment/lead-assignment.module';
import { LeadConsumerModule } from './modules/lead-consumer/lead-consumer.module';

@Module({
  imports: [
    ConfigAppModule,
    ScheduleModule.forRoot(),
    HealthModule,
    LeadConsumerModule,
    LeadAssignmentModule
  ]
})
export class AppModule {}
