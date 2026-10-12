import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel } from 'kafkajs';

export const KAFKA_CLIENT = Symbol('KAFKA_CLIENT');

@Module({
  providers: [
    {
      provide: KAFKA_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Kafka =>
        new Kafka({
          clientId: config.getOrThrow<string>('KAFKA_CLIENT_ID'),
          brokers: config
            .getOrThrow<string>('KAFKA_BROKERS')
            .split(',')
            .map((broker) => broker.trim())
            .filter((broker) => broker.length > 0),
          logLevel: logLevel.WARN
        })
    }
  ],
  exports: [KAFKA_CLIENT]
})
export class KafkaModule {}
