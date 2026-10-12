import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterSchema, LeadActivitySchema, LeadSchema, UserSchema } from '@lead/persistence';

import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../cache/cache.module';
import { UsersModule } from '../users/users.module';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { AddLeadActivityService } from './application/add-lead-activity.service';
import { CreateLeadService } from './application/create-lead.service';
import { GetLeadDetailsService } from './application/get-lead-details.service';
import { ListLeadActivitiesService } from './application/list-lead-activities.service';
import { ListLeadsService } from './application/list-leads.service';
import { SetLeadLabelService } from './application/set-lead-label.service';
import { CLOCK_PORT } from './domain/ports/clock.port';
import { LEAD_ACTIVITY_REPOSITORY_PORT } from './domain/ports/lead-activity-repository.port';
import { LEAD_CACHE_PORT } from './domain/ports/lead-cache.port';
import { LEAD_INGESTION_PORT } from './domain/ports/lead-ingestion.port';
import { LEAD_REPOSITORY_PORT } from './domain/ports/lead-repository.port';
import { LEAD_SEARCH_INDEX_PORT } from './domain/ports/lead-search-index.port';
import { RedisLeadCache } from './infrastructure/cache/redis-lead.cache';
import { MongooseLeadIngestionAdapter } from './infrastructure/mongoose-lead-ingestion.adapter';
import { MongooseLeadActivityRepository } from './infrastructure/repositories/mongoose-lead-activity.repository';
import { MongooseLeadRepository } from './infrastructure/repositories/mongoose-lead.repository';
import { RedisLeadSearchIndex } from './infrastructure/search/redis-lead-search-index';
import { SystemClock } from './infrastructure/system-clock';
import { LeadActivitiesController } from './interface/http/lead-activities.controller';
import { LeadsController } from './interface/http/leads.controller';

@Module({
  imports: [
    AuthModule,
    CacheModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema, collection: 'users' },
      { name: 'Lead', schema: LeadSchema, collection: 'leads' },
      { name: 'LeadActivity', schema: LeadActivitySchema, collection: 'lead_activities' },
      { name: 'Counter', schema: CounterSchema, collection: 'counters' }
    ])
  ],
  controllers: [LeadsController, LeadActivitiesController],
  providers: [
    ApiKeyGuard,
    CreateLeadService,
    ListLeadsService,
    GetLeadDetailsService,
    SetLeadLabelService,
    AddLeadActivityService,
    ListLeadActivitiesService,
    MongooseLeadIngestionAdapter,
    MongooseLeadActivityRepository,
    { provide: LEAD_REPOSITORY_PORT, useClass: MongooseLeadRepository },
    { provide: LEAD_ACTIVITY_REPOSITORY_PORT, useExisting: MongooseLeadActivityRepository },
    { provide: LEAD_CACHE_PORT, useClass: RedisLeadCache },
    { provide: LEAD_SEARCH_INDEX_PORT, useClass: RedisLeadSearchIndex },
    { provide: CLOCK_PORT, useClass: SystemClock },
    { provide: LEAD_INGESTION_PORT, useExisting: MongooseLeadIngestionAdapter }
  ]
})
export class LeadsModule {}
