import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../../core/redis/redis.module';
import { CachePort } from '../../domain/ports/cache.port';

@Injectable()
export class RedisCacheAdapter implements CachePort {
  private readonly logger = new Logger(RedisCacheAdapter.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redisClient.status === 'end') {
        await this.redisClient.connect();
      }
      const raw = await this.redisClient.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      this.logger.warn(`Redis cache read failed for key ${key}`);
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
      this.logger.warn(`Redis cache write failed for key ${key}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.connectIfEnded();
      await this.redisClient.del(key);
    } catch {
      this.logger.warn(`Redis cache delete failed for key ${key}`);
    }
  }

  async incr(key: string): Promise<number | null> {
    try {
      await this.connectIfEnded();
      return await this.redisClient.incr(key);
    } catch {
      this.logger.warn(`Redis cache increment failed for key ${key}`);
      return null;
    }
  }

  async getNumber(key: string): Promise<number | null> {
    try {
      await this.connectIfEnded();
      const value = await this.redisClient.get(key);
      if (value === null) {
        return null;
      }
      const number = Number(value);
      return Number.isSafeInteger(number) ? number : null;
    } catch {
      this.logger.warn(`Redis numeric cache read failed for key ${key}`);
      return null;
    }
  }

  private async connectIfEnded(): Promise<void> {
    if (this.redisClient.status === 'end') {
      await this.redisClient.connect();
    }
  }
}
