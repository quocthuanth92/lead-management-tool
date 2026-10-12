import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseModule } from '../../core/database/database.module';
import { KafkaModule } from '../../core/kafka/kafka.module';
import { RedisLeadCacheInvalidator, RedisModule } from '../../core/redis/redis.module';
import { ProcessLeadEventService } from './application/process-lead-event.service';
import { ConsumerRetryPolicy } from './application/retry-policy';
import { DEAD_LETTER_PORT } from './domain/ports/dead-letter.port';
import { LEAD_CACHE_INVALIDATOR_PORT } from './domain/ports/lead-cache-invalidator.port';
import { LEAD_INGESTION_PORT } from './domain/ports/lead-ingestion.port';
import { KafkaDeadLetterProducer } from './infrastructure/kafka-dead-letter.producer';
import { MongoLeadIngestionAdapter } from './infrastructure/mongo-lead-ingestion.adapter';
import { KafkaLeadConsumer } from './interface/kafka/kafka-lead-consumer';
import { LeadConsumerHandler } from './interface/kafka/lead-consumer.handler';

@Module({
  imports: [DatabaseModule, RedisModule, KafkaModule],
  providers: [
    ProcessLeadEventService,
    LeadConsumerHandler,
    KafkaLeadConsumer,
    MongoLeadIngestionAdapter,
    KafkaDeadLetterProducer,
    {
      provide: LEAD_INGESTION_PORT,
      useExisting: MongoLeadIngestionAdapter
    },
    {
      provide: DEAD_LETTER_PORT,
      useExisting: KafkaDeadLetterProducer
    },
    {
      provide: LEAD_CACHE_INVALIDATOR_PORT,
      useExisting: RedisLeadCacheInvalidator
    },
    {
      provide: ConsumerRetryPolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ConsumerRetryPolicy =>
        new ConsumerRetryPolicy({
          attempts: config.getOrThrow<number>('CONSUMER_RETRY_ATTEMPTS'),
          baseDelayMs: config.getOrThrow<number>('CONSUMER_RETRY_DELAY_MS')
        })
    }
  ]
})
export class LeadConsumerModule {}
