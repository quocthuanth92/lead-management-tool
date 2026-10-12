import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Consumer, Kafka } from 'kafkajs';

import { KAFKA_CLIENT } from '../../../../core/kafka/kafka.module';
import { LeadConsumerHandler } from './lead-consumer.handler';

const START_RETRY_DELAY_MS = 5000;

function toText(buffer: Buffer | null | undefined): string | null {
  return buffer ? buffer.toString('utf8') : null;
}

@Injectable()
export class KafkaLeadConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(KafkaLeadConsumer.name);
  private consumer?: Consumer;
  private retryTimer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    @Inject(KAFKA_CLIENT) private readonly kafka: Kafka,
    private readonly config: ConfigService,
    private readonly handler: LeadConsumerHandler
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.retryTimer);
    await this.consumer?.disconnect();
  }

  private async start(): Promise<void> {
    const topic = this.config.getOrThrow<string>('KAFKA_LEADS_TOPIC');
    const consumer = this.kafka.consumer({
      groupId: this.config.getOrThrow<string>('KAFKA_GROUP_ID')
    });
    this.consumer = consumer;

    try {
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: true });
      await consumer.run({
        autoCommit: false,
        eachMessage: async ({ topic: messageTopic, partition, message }) => {
          await this.handler.handle({
            topic: messageTopic,
            partition,
            offset: message.offset,
            key: toText(message.key),
            value: toText(message.value) ?? ''
          });
          await consumer.commitOffsets([
            {
              topic: messageTopic,
              partition,
              offset: (BigInt(message.offset) + BigInt(1)).toString()
            }
          ]);
        }
      });
    } catch (error) {
      this.logger.warn(
        `Lead consumer not started (error=${error instanceof Error ? error.name : 'UnknownError'}); retrying in ${START_RETRY_DELAY_MS} ms`
      );
      await consumer.disconnect().catch(() => undefined);
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.stopped) {
      return;
    }
    this.retryTimer = setTimeout(() => void this.start(), START_RETRY_DELAY_MS);
  }
}
