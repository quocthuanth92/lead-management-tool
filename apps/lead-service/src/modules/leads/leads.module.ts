import { Module } from '@nestjs/common';

import { LeadsService } from './application/leads.service';
import { LEAD_CACHE_PORT } from './domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT } from './domain/ports/lead-repository.port';
import { RedisLeadCache } from './infrastructure/cache/redis-lead.cache';
import { MongooseLeadRepository } from './infrastructure/repositories/mongoose-lead.repository';
import { LeadsController } from './interface/http/leads.controller';

@Module({
  controllers: [LeadsController],
  providers: [
    LeadsService,
    { provide: LEAD_REPOSITORY_PORT, useClass: MongooseLeadRepository },
    { provide: LEAD_CACHE_PORT, useClass: RedisLeadCache }
  ]
})
export class LeadsModule {}
