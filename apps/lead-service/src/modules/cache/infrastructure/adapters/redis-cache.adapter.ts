import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../../core/redis/redis.module';
import { CachePort } from '../../domain/ports/cache.port';

@Injectable()
export class RedisCacheAdapter implements CachePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redisClient.status === 'end') {
        await this.redisClient.connect();
      }
      const raw = await this.redisClient.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      if (this.redisClient.status === 'end') {
        await this.redisClient.connect();
      }
      await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache failures are tolerated.
    }
  }
}
