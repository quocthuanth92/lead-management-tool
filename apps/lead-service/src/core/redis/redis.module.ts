import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
class RedisClientShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  onApplicationShutdown(): void {
    if (this.redisClient.status !== 'end') {
      this.redisClient.disconnect();
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const client = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: (attempt) => Math.min(attempt * 100, 2000)
        });
        return client;
      }
    },
    RedisClientShutdown
  ],
  exports: [REDIS_CLIENT]
})
export class RedisModule {}
