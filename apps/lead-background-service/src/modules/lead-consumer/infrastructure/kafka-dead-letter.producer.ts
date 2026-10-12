import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DeadLetterEnvelope } from '@lead/shared-contracts';
import { type Kafka, type Producer, Partitioners } from 'kafkajs';

import { KAFKA_CLIENT } from '../../../core/kafka/kafka.module';
import { DeadLetterPort } from '../domain/ports/dead-letter.port';

@Injectable()
export class KafkaDeadLetterProducer implements DeadLetterPort, OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer;
  private readonly topic: string;

  constructor(@Inject(KAFKA_CLIENT) kafka: Kafka, config: ConfigService) {
    this.producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    this.topic = config.getOrThrow<string>('KAFKA_LEADS_DLQ_TOPIC');
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
  }

  async publish(envelope: DeadLetterEnvelope): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [{ key: envelope.originalKey ?? null, value: JSON.stringify(envelope) }]
    });
  }
}
