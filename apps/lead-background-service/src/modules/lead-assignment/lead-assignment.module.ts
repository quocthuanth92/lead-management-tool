import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../core/database/database.module';
import { RedisLeadCacheInvalidator, RedisModule } from '../../core/redis/redis.module';
import { AssignHeldLeadsService } from './application/assign-held-leads.service';
import { ASSIGNMENT_CACHE_INVALIDATOR_PORT } from './domain/ports/assignment-cache-invalidator.port';
import { HELD_LEADS_PORT } from './domain/ports/held-leads.port';
import { MongoHeldLeadsAdapter } from './infrastructure/mongo-held-leads.adapter';
import { HeldLeadsScheduler } from './infrastructure/held-leads-scheduler';

@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [
    AssignHeldLeadsService,
    HeldLeadsScheduler,
    MongoHeldLeadsAdapter,
    {
      provide: HELD_LEADS_PORT,
      useExisting: MongoHeldLeadsAdapter
    },
    {
      provide: ASSIGNMENT_CACHE_INVALIDATOR_PORT,
      useExisting: RedisLeadCacheInvalidator
    }
  ]
})
export class LeadAssignmentModule {}
