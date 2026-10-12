import { Inject, Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { leadKey, leadsVersionKey } from '@lead/persistence';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const REDIS_RETRY_STEP_MS = 100;
const REDIS_RETRY_MAX_MS = 2000;

@Injectable()
export class RedisLeadCacheInvalidator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async invalidateLeadWrite(leadId: string, ownerId: string): Promise<void> {
    await Promise.all([this.redis.del(leadKey(leadId)), this.redis.incr(leadsVersionKey(ownerId))]);
  }
}

function createRedisClient(url: string): Redis {
  const logger = new Logger('RedisClient');
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * REDIS_RETRY_STEP_MS, REDIS_RETRY_MAX_MS)
  });
  client.on('error', (error: Error) => {
    logger.warn(`Redis connection error (error=${error.name})`);
  });
  return client;
}

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis =>
        createRedisClient(config.getOrThrow<string>('REDIS_URL'))
    },
    RedisLeadCacheInvalidator
  ],
  exports: [REDIS_CLIENT, RedisLeadCacheInvalidator]
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
