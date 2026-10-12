import { Inject, Injectable } from '@nestjs/common';
import type { HealthResponse, HealthStatus } from '@lead/shared-contracts';
import type Redis from 'ioredis';
import type { Connection } from 'mongoose';

import { MONGO_CONNECTION } from '../../core/database/database.module';
import { REDIS_CLIENT } from '../../core/redis/redis.module';

const MONGO_READY_STATE_CONNECTED = 1;

@Injectable()
export class HealthService {
  constructor(
    @Inject(MONGO_CONNECTION) private readonly connection: Pick<Connection, 'readyState'>,
    @Inject(REDIS_CLIENT) private readonly redis: Pick<Redis, 'ping'>
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const db: HealthStatus =
      this.connection.readyState === MONGO_READY_STATE_CONNECTED ? 'up' : 'down';
    const redis = await this.checkRedis();

    const status: HealthResponse['status'] =
      db === 'down' ? 'down' : redis === 'down' ? 'degraded' : 'ok';
    return { status, db, redis };
  }

  private async checkRedis(): Promise<HealthStatus> {
    try {
      return (await this.redis.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
