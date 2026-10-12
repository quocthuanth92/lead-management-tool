import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { leadKey, leadListKey, leadsVersionKey } from '@lead/persistence';

import { CACHE_PORT, CachePort } from '../../../cache/domain/ports/cache.port';
import { CachedLeadRecord, LeadCachePort } from '../../domain/ports/lead-cache.port';

@Injectable()
export class RedisLeadCache implements LeadCachePort {
  constructor(
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    private readonly configService: ConfigService
  ) {}

  async getVersion(userId: string): Promise<number> {
    return (await this.cache.getNumber(leadsVersionKey(userId))) ?? 0;
  }

  async getList<T>(userId: string, version: number, query: unknown): Promise<T | null> {
    return this.cache.get<T>(leadListKey(userId, version, query));
  }

  async setList<T>(userId: string, version: number, query: unknown, value: T): Promise<void> {
    await this.cache.set(
      leadListKey(userId, version, query),
      value,
      this.configService.get<number>('CACHE_LIST_TTL_SECONDS', 60)
    );
  }

  async getLead(id: string): Promise<CachedLeadRecord | null> {
    return this.cache.get<CachedLeadRecord>(leadKey(id));
  }

  async setLead(id: string, lead: CachedLeadRecord): Promise<void> {
    await this.cache.set(
      leadKey(id),
      lead,
      this.configService.get<number>('CACHE_LEAD_TTL_SECONDS', 300)
    );
  }

  async invalidateLead(id: string): Promise<void> {
    await this.cache.del(leadKey(id));
  }

  async invalidateUserLists(userId: string): Promise<void> {
    await this.cache.incr(leadsVersionKey(userId));
  }
}
