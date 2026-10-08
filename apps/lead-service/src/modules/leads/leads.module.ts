import { Module } from '@nestjs/common';

import { LeadActivitiesService } from './application/lead-activities.service';
import { LeadsService } from './application/leads.service';
import { LEAD_CACHE_PORT } from './domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT } from './domain/ports/lead-repository.port';
import { RedisLeadCache } from './infrastructure/cache/redis-lead.cache';
import { MongooseLeadActivityRepository } from './infrastructure/repositories/mongoose-lead-activity.repository';
import { MongooseLeadRepository } from './infrastructure/repositories/mongoose-lead.repository';
import { LeadActivitiesController } from './interface/http/lead-activities.controller';
import { LeadsController } from './interface/http/leads.controller';

@Module({
  controllers: [LeadsController, LeadActivitiesController],
  providers: [
    LeadsService,
    LeadActivitiesService,
    MongooseLeadActivityRepository,
    { provide: LEAD_REPOSITORY_PORT, useClass: MongooseLeadRepository },
    { provide: LEAD_CACHE_PORT, useClass: RedisLeadCache }
  ]
})
export class LeadsModule {}
