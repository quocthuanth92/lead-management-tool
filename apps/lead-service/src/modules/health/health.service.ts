import { Inject, Injectable } from '@nestjs/common';
import { HealthResponse } from '@lead/shared-contracts';
import Redis from 'ioredis';
import mongoose from 'mongoose';

import { REDIS_CLIENT } from '../../core/redis/redis.module';

@Injectable()
export class HealthService {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async getHealth(): Promise<HealthResponse> {
    const db = mongoose.connection.readyState === 1 ? 'up' : 'down';
    let redis: 'up' | 'down' = 'down';

    try {
      if (this.redisClient.status === 'end') {
        await this.redisClient.connect();
      }
      const pong = await this.redisClient.ping();
      redis = pong === 'PONG' ? 'up' : 'down';
    } catch {
      redis = 'down';
    }

    const status: HealthResponse['status'] =
      db === 'down' ? 'down' : redis === 'down' ? 'degraded' : 'ok';
    return { status, db, redis };
  }
}
