import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../../core/redis/redis.module';
import { Lead } from '../../domain/entities/lead.entity';
import { LeadCachePort } from '../../domain/ports/lead-cache.port';

@Injectable()
export class RedisLeadCache implements LeadCachePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async setPlaceholderLead(lead: Lead): Promise<void> {
    try {
      if (this.redisClient.status === 'end') {
        await this.redisClient.connect();
      }
      await this.redisClient.set(`lead:${lead.id}`, JSON.stringify(lead), 'EX', 300);
    } catch {
      // Intentionally tolerate cache outages for scaffolding stage.
    }
  }
}
