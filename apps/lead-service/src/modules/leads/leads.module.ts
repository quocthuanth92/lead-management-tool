import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CounterSchema, LeadActivitySchema, LeadSchema, UserSchema } from '@lead/persistence';

import { CacheModule } from '../cache/cache.module';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { LEAD_INGESTION_PORT } from './domain/ports/lead-ingestion.port';
import { LeadsService } from './application/leads.service';
import { CreateLeadService } from './application/create-lead.service';
import { LEAD_CACHE_PORT } from './domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT } from './domain/ports/lead-repository.port';
import { RedisLeadCache } from './infrastructure/cache/redis-lead.cache';
import { MongooseLeadIngestionAdapter } from './infrastructure/mongoose-lead-ingestion.adapter';
import { MongooseLeadRepository } from './infrastructure/repositories/mongoose-lead.repository';
import { LeadActivitiesController } from './interface/http/lead-activities.controller';
import { LeadsController } from './interface/http/leads.controller';

@Module({
  imports: [
    CacheModule,
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
    LeadsService,
    CreateLeadService,
    MongooseLeadIngestionAdapter,
    { provide: LEAD_REPOSITORY_PORT, useClass: MongooseLeadRepository },
    { provide: LEAD_CACHE_PORT, useClass: RedisLeadCache },
    { provide: LEAD_INGESTION_PORT, useExisting: MongooseLeadIngestionAdapter }
  ]
})
export class LeadsModule {}
