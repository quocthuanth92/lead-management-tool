import { Module } from '@nestjs/common';

import { LeadActivitiesService } from './application/lead-activities.service';
import { MongooseLeadActivityRepository } from './infrastructure/repositories/mongoose-lead-activity.repository';
import { LeadActivitiesController } from './interface/http/lead-activities.controller';

@Module({
  controllers: [LeadActivitiesController],
  providers: [LeadActivitiesService, MongooseLeadActivityRepository]
})
export class LeadActivitiesModule {}
