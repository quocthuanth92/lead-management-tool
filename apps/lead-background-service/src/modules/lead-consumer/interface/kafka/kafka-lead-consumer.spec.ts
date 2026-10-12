import type { ConfigService } from '@nestjs/config';
import type { Kafka } from 'kafkajs';

import type { LeadConsumerHandler } from './lead-consumer.handler';
import { KafkaLeadConsumer } from './kafka-lead-consumer';

describe('KafkaLeadConsumer', () => {
  let consumer: {
    connect: jest.Mock;
    subscribe: jest.Mock;
    run: jest.Mock;
    commitOffsets: jest.Mock;
    disconnect: jest.Mock;
  };
  let kafka: { consumer: jest.Mock };
  let handler: { handle: jest.Mock };
  let config: { getOrThrow: jest.Mock };

  beforeEach(() => {
    consumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
      commitOffsets: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined)
    };
    kafka = { consumer: jest.fn().mockReturnValue(consumer) };
    handler = { handle: jest.fn().mockResolvedValue(undefined) };
    const values: Record<string, string> = {
      KAFKA_LEADS_TOPIC: 'custom.leads',
      KAFKA_GROUP_ID: 'custom-group'
    };
    config = { getOrThrow: jest.fn((key: string) => values[key]) };
  });

  function createConsumer(): KafkaLeadConsumer {
    return new KafkaLeadConsumer(
      kafka as unknown as Kafka,
      config as unknown as ConfigService,
      handler as unknown as LeadConsumerHandler
    );
  }

  it('subscribes to the topic and group from validated config, not hard-coded values', async () => {
    await createConsumer().onApplicationBootstrap();

    expect(kafka.consumer).toHaveBeenCalledWith({ groupId: 'custom-group' });
    expect(consumer.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'custom.leads' })
    );
  });

  it('maps raw kafkajs messages to strings and passes topic, partition and offset to the handler', async () => {
    await createConsumer().onApplicationBootstrap();
    const { eachMessage } = consumer.run.mock.calls[0][0] as {
      eachMessage: (payload: unknown) => Promise<void>;
    };

    await eachMessage({
      topic: 'custom.leads',
      partition: 1,
      message: {
        offset: '9',
        key: Buffer.from('3f2c9a1e-8b7d-4c6e-9f0a-1234567890ab'),
        value: Buffer.from('{"schemaVersion":1}')
      }
    });

    expect(handler.handle).toHaveBeenCalledWith({
      topic: 'custom.leads',
      partition: 1,
      offset: '9',
      key: '3f2c9a1e-8b7d-4c6e-9f0a-1234567890ab',
      value: '{"schemaVersion":1}'
    });
  });

  it('treats a missing key or value as null and empty string', async () => {
    await createConsumer().onApplicationBootstrap();
    const { eachMessage } = consumer.run.mock.calls[0][0] as {
      eachMessage: (payload: unknown) => Promise<void>;
    };

    await eachMessage({
      topic: 'custom.leads',
      partition: 0,
      message: { offset: '0', key: null, value: null }
    });

    expect(handler.handle).toHaveBeenCalledWith({
      topic: 'custom.leads',
      partition: 0,
      offset: '0',
      key: null,
      value: ''
    });
  });

  it('commits the next offset only after the handler succeeds', async () => {
    await createConsumer().onApplicationBootstrap();
    const { eachMessage, autoCommit } = consumer.run.mock.calls[0][0] as {
      eachMessage: (payload: unknown) => Promise<void>;
      autoCommit: boolean;
    };

    await eachMessage({
      topic: 'custom.leads',
      partition: 1,
      message: { offset: '9', key: null, value: Buffer.from('{}') }
    });

    expect(autoCommit).toBe(false);
    expect(consumer.commitOffsets).toHaveBeenCalledWith([
      { topic: 'custom.leads', partition: 1, offset: '10' }
    ]);
    expect(handler.handle.mock.invocationCallOrder[0]).toBeLessThan(
      consumer.commitOffsets.mock.invocationCallOrder[0]
    );
  });

  it('does not commit the offset when the handler fails so Kafka redelivers', async () => {
    handler.handle.mockRejectedValue(new Error('broker unavailable'));
    await createConsumer().onApplicationBootstrap();
    const { eachMessage } = consumer.run.mock.calls[0][0] as {
      eachMessage: (payload: unknown) => Promise<void>;
    };

    await expect(
      eachMessage({
        topic: 'custom.leads',
        partition: 1,
        message: { offset: '9', key: null, value: Buffer.from('{}') }
      })
    ).rejects.toThrow('broker unavailable');
    expect(consumer.commitOffsets).not.toHaveBeenCalled();
  });

  it('retries subscription until the topic exists instead of failing bootstrap', async () => {
    jest.useFakeTimers();
    try {
      consumer.subscribe
        .mockRejectedValueOnce(new Error('UNKNOWN_TOPIC_OR_PARTITION'))
        .mockResolvedValue(undefined);
      const instance = createConsumer();

      await expect(instance.onApplicationBootstrap()).resolves.toBeUndefined();
      expect(consumer.run).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(5000);

      expect(consumer.subscribe).toHaveBeenCalledTimes(2);
      expect(consumer.run).toHaveBeenCalledTimes(1);
      await instance.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('disconnects the consumer on module destroy', async () => {
    const instance = createConsumer();
    await instance.onApplicationBootstrap();

    await instance.onModuleDestroy();

    expect(consumer.disconnect).toHaveBeenCalledTimes(1);
  });
});
