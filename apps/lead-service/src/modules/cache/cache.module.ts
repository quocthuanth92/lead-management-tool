import { Module } from '@nestjs/common';

import { CACHE_PORT } from './domain/ports/cache.port';
import { RedisCacheAdapter } from './infrastructure/adapters/redis-cache.adapter';

@Module({
  providers: [{ provide: CACHE_PORT, useClass: RedisCacheAdapter }],
  exports: [CACHE_PORT]
})
export class CacheModule {}
