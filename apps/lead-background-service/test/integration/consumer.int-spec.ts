import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { promisify } from 'node:util';

import { Test } from '@nestjs/testing';
import { KafkaContainer } from '@testcontainers/kafka';
import { DeadLetterEnvelope, KAFKA_TOPICS } from '@lead/shared-contracts';
import { leadsVersionKey, PersistenceModels, registerModels } from '@lead/persistence';
import { Kafka, logLevel, Producer } from 'kafkajs';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

const execFileAsync = promisify(execFile);

type Readable<T> = T | null | undefined | false;

const KAFKA_IMAGE = 'confluentinc/cp-kafka:7.6.1';
const KAFKA_PLAINTEXT_PORT = 9093;
const MONGO_PORT = 27017;
const REDIS_PORT = 6379;
const MAX_ATTEMPTS = 3;

interface DlqRecord {
  key: string | null;
  envelope: DeadLetterEnvelope;
}

interface Harness {
  mongo: StartedTestContainer;
  models: PersistenceModels;
  redis: Redis;
  producer: Producer;
  dlqRecords: DlqRecord[];
}

let harness: Harness;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor<T>(
  read: () => Readable<T> | PromiseLike<Readable<T>>,
  description: string,
  timeoutMs = 30_000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  const reason = lastError instanceof Error ? ` (last error: ${lastError.name})` : '';
  throw new Error(`Timed out waiting for ${description}${reason}`);
}

function validEventValue(overrides: { eventId?: string; fullName?: string; phone?: string } = {}): {
  eventId: string;
  value: string;
} {
  const eventId = overrides.eventId ?? randomUUID();
  const value = JSON.stringify({
    schemaVersion: 1,
    eventId,
    occurredAt: new Date().toISOString(),
    lead: {
      fullName: overrides.fullName ?? 'Tran Van An',
      phone: overrides.phone ?? '+84 90 123 4567',
      email: 'an.tran@example.com',
      message: 'Test drive please'
    }
  });
  return { eventId, value };
}

async function publish(value: string, key: string | null): Promise<void> {
  await harness.producer.send({
    topic: KAFKA_TOPICS.LEADS_INCOMING,
    messages: [{ key, value }]
  });
}

async function publishValid(
  overrides: { eventId?: string; fullName?: string; phone?: string } = {}
): Promise<string> {
  const { eventId, value } = validEventValue(overrides);
  await publish(value, eventId);
  return eventId;
}

function leadByEventId(eventId: string) {
  return harness.models.Lead.findOne({ externalEventId: eventId }).lean();
}

async function createSalesperson(email: string, fullName: string): Promise<string> {
  const now = new Date();
  const user = await harness.models.User.create({
    email,
    passwordHash: 'scrypt$integration$unused',
    fullName,
    role: 'SALESPERSON',
    isActive: true,
    createdAt: now,
    updatedAt: now
  });
  return String(user._id);
}

function dlqFor(predicate: (record: DlqRecord) => boolean): DlqRecord | undefined {
  return harness.dlqRecords.find(predicate);
}

async function withMongoStopped<T>(action: () => Promise<T>): Promise<T> {
  const containerId = harness.mongo.getId();
  await execFileAsync('docker', ['stop', '--time', '2', containerId]);
  try {
    return await action();
  } finally {
    await execFileAsync('docker', ['start', containerId]);
  }
}

const teardowns: Array<() => Promise<unknown>> = [];

async function runTeardowns(): Promise<void> {
  while (teardowns.length > 0) {
    const teardown = teardowns.pop();
    try {
      await teardown?.();
    } catch {
      // Best-effort cleanup: keep tearing down the remaining resources.
    }
  }
}

async function reserveFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function startHarness(): Promise<Harness> {
  // Pinned host port so the Mongo container keeps its endpoint across docker stop/start (TC-12c).
  const mongoHostPort = await reserveFreePort();
  const mongo = await new GenericContainer('mongo:7')
    .withExposedPorts({ container: MONGO_PORT, host: mongoHostPort })
    .start();
  teardowns.push(() => mongo.stop());
  const redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(REDIS_PORT)
    .start();
  teardowns.push(() => redisContainer.stop());
  const kafkaContainer = await new KafkaContainer(KAFKA_IMAGE).start();
  teardowns.push(() => kafkaContainer.stop());

  const mongoUri = `mongodb://${mongo.getHost()}:${mongo.getMappedPort(MONGO_PORT)}/lead_it?directConnection=true&serverSelectionTimeoutMS=2000`;
  const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(REDIS_PORT)}`;
  const brokers = `${kafkaContainer.getHost()}:${kafkaContainer.getMappedPort(KAFKA_PLAINTEXT_PORT)}`;

  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '3002',
    MONGODB_URI: mongoUri,
    REDIS_URL: redisUrl,
    KAFKA_BROKERS: brokers,
    KAFKA_CLIENT_ID: 'lead-background-service-it',
    KAFKA_GROUP_ID: `lead-consumer-it-${randomUUID()}`,
    KAFKA_LEADS_TOPIC: KAFKA_TOPICS.LEADS_INCOMING,
    KAFKA_LEADS_DLQ_TOPIC: KAFKA_TOPICS.LEADS_DLQ,
    CONSUMER_RETRY_ATTEMPTS: String(MAX_ATTEMPTS),
    CONSUMER_RETRY_DELAY_MS: '100',
    ASSIGN_HELD_LEADS_INTERVAL_SECONDS: '1',
    ASSIGN_HELD_LEADS_BATCH_SIZE: '100'
  });

  const kafka = new Kafka({
    clientId: 'lead-background-service-it-test',
    brokers: [brokers],
    logLevel: logLevel.NOTHING
  });

  const admin = kafka.admin();
  await admin.connect();
  await waitFor(
    async () => {
      const cluster = await admin.describeCluster();
      return cluster.controller !== null && cluster.controller >= 0 ? cluster : null;
    },
    'Kafka controller election',
    60_000
  );
  await admin.createTopics({
    waitForLeaders: true,
    topics: [
      { topic: KAFKA_TOPICS.LEADS_INCOMING, numPartitions: 1 },
      { topic: KAFKA_TOPICS.LEADS_DLQ, numPartitions: 1 }
    ]
  });
  await admin.disconnect();

  const producer = kafka.producer();
  await producer.connect();
  teardowns.push(() => producer.disconnect());

  const dlqRecords: DlqRecord[] = [];
  const dlqConsumer = kafka.consumer({ groupId: `dlq-reader-${randomUUID()}` });
  teardowns.push(() => dlqConsumer.disconnect());
  await dlqConsumer.connect();
  await dlqConsumer.subscribe({ topic: KAFKA_TOPICS.LEADS_DLQ, fromBeginning: true });
  await dlqConsumer.run({
    eachMessage: async ({ message }) => {
      dlqRecords.push({
        key: message.key ? message.key.toString('utf8') : null,
        envelope: JSON.parse(message.value?.toString('utf8') ?? '{}') as DeadLetterEnvelope
      });
    }
  });

  const mongoConnection = await mongoose.createConnection(mongoUri).asPromise();
  teardowns.push(() => mongoConnection.close());
  const models = registerModels(mongoConnection);
  const redis = new Redis(redisUrl);
  teardowns.push(() => redis.quit());

  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  await app.init();
  teardowns.push(() => app.close());

  return {
    mongo,
    models,
    redis,
    producer,
    dlqRecords
  };
}

async function clearState(): Promise<void> {
  await Promise.all([
    harness.models.Lead.deleteMany({}),
    harness.models.LeadActivity.deleteMany({}),
    harness.models.User.deleteMany({}),
    harness.models.Counter.deleteMany({}),
    harness.redis.flushdb()
  ]);
}

describe('Lead consumer integration (TC-12, TC-12b, TC-12c, TC-12d)', () => {
  beforeAll(async () => {
    harness = await startHarness();
  }, 300_000);

  afterAll(async () => {
    await runTeardowns();
  }, 120_000);

  beforeEach(async () => {
    await clearState();
    harness.dlqRecords.length = 0;
  });

  describe('TC-12: valid events', () => {
    it('stores one EXTERNAL lead for a valid event, assigned and unread, and invalidates the cache', async () => {
      const userId = await createSalesperson('solo@example.com', 'Solo Salesperson');

      const eventId = await publishValid({ phone: '+84 90 123 4567' });
      const lead = await waitFor(() => leadByEventId(eventId), 'lead for valid event');

      expect(lead.source).toBe('EXTERNAL');
      expect(lead.externalEventId).toBe(eventId);
      expect(lead.assignmentStatus).toBe('ASSIGNED');
      expect(String(lead.userId)).toBe(userId);
      expect(lead.label).toBe('UNLABELED');
      expect(lead.hasView).toBe(false);
      expect(lead.phone).toBe('+84901234567');
      expect(lead.fullName).toBe('Tran Van An');
      await expect(
        waitFor(async () => harness.redis.get(leadsVersionKey(userId)), 'list version bump')
      ).resolves.toBe('1');
    });

    it('stores exactly one lead when the same event is delivered twice', async () => {
      await createSalesperson('dup@example.com', 'Duplicate Salesperson');
      const { eventId, value } = validEventValue();

      await publish(value, eventId);
      await publish(value, eventId);
      const sentinelId = await publishValid();
      await waitFor(() => leadByEventId(sentinelId), 'sentinel lead');

      const count = await harness.models.Lead.countDocuments({ externalEventId: eventId });
      expect(count).toBe(1);
      expect(harness.dlqRecords).toHaveLength(0);
    });

    it('assigns consecutive events to two salespeople in round-robin order', async () => {
      const first = await createSalesperson('rr-a@example.com', 'Salesperson A');
      const second = await createSalesperson('rr-b@example.com', 'Salesperson B');

      const assignees: string[] = [];
      for (let index = 0; index < 4; index += 1) {
        const eventId = await publishValid({ fullName: `Customer ${index}` });
        const lead = await waitFor(() => leadByEventId(eventId), `lead ${index}`);
        assignees.push(String(lead.userId));
      }

      expect(assignees).toEqual([first, second, first, second]);
    });
  });

  describe('TC-12b: poison messages', () => {
    it('dead-letters an invalid payload and a non-JSON message, then keeps processing later events', async () => {
      await createSalesperson('poison@example.com', 'Poison Salesperson');
      const invalidEventId = randomUUID();
      const invalidValue = JSON.stringify({
        schemaVersion: 1,
        eventId: invalidEventId,
        occurredAt: new Date().toISOString(),
        lead: { fullName: 'Missing Phone Customer', message: 'Call me' }
      });
      const poisonValue = `{not-json ${randomUUID()}`;

      await publish(invalidValue, invalidEventId);
      await publish(poisonValue, null);

      const invalidRecord = await waitFor(
        () => dlqFor((record) => record.envelope.originalValue === invalidValue),
        'DLQ record for invalid payload'
      );
      const poisonRecord = await waitFor(
        () => dlqFor((record) => record.envelope.originalValue === poisonValue),
        'DLQ record for poison message'
      );

      expect(invalidRecord.envelope.reason).toBe('INVALID_PAYLOAD');
      expect(invalidRecord.envelope.attempts).toBe(1);
      expect(invalidRecord.envelope.details?.join(' ')).toContain('lead.phone');
      expect(invalidRecord.envelope.sourceTopic).toBe(KAFKA_TOPICS.LEADS_INCOMING);
      expect(poisonRecord.envelope.reason).toBe('INVALID_PAYLOAD');
      expect(poisonRecord.key).toBeNull();

      const laterEventId = await publishValid();
      await waitFor(() => leadByEventId(laterEventId), 'lead after poison messages');

      expect(
        harness.dlqRecords.filter((record) => record.envelope.originalValue === invalidValue)
      ).toHaveLength(1);
      expect(
        harness.dlqRecords.filter((record) => record.envelope.originalValue === poisonValue)
      ).toHaveLength(1);
      await expect(
        harness.models.Lead.countDocuments({ fullName: 'Missing Phone Customer' })
      ).resolves.toBe(0);
    });
  });

  describe('TC-12c: MongoDB unavailable during processing', () => {
    it('retries with backoff, dead-letters after the last attempt, and recovers for later events', async () => {
      await createSalesperson('outage@example.com', 'Outage Salesperson');

      const outageEventId = await withMongoStopped(async () => {
        const eventId = await publishValid();
        const record = await waitFor(
          () => dlqFor((entry) => entry.envelope.originalKey === eventId),
          'DLQ record after MongoDB outage',
          90_000
        );
        expect(record.envelope.reason).toBe('PROCESSING_FAILED');
        expect(record.envelope.attempts).toBe(MAX_ATTEMPTS);
        expect(record.envelope.details?.length).toBeGreaterThan(0);
        return eventId;
      });

      const recoveredEventId = await publishValid();
      await waitFor(() => leadByEventId(recoveredEventId), 'lead after MongoDB recovery', 60_000);
      await expect(leadByEventId(outageEventId)).resolves.toBeNull();
    }, 180_000);
  });

  describe('TC-12d: no salesperson available', () => {
    it('stores the lead as UNASSIGNED and assigns it within one scheduler interval once a salesperson exists', async () => {
      const eventId = await publishValid();
      const held = await waitFor(async () => {
        const lead = await leadByEventId(eventId);
        return lead?.assignmentStatus === 'UNASSIGNED' ? lead : null;
      }, 'held lead stored UNASSIGNED');
      expect(held.userId).toBeUndefined();

      const userId = await createSalesperson('late@example.com', 'Late Salesperson');

      const assigned = await waitFor(
        async () => {
          const lead = await leadByEventId(eventId);
          return lead?.assignmentStatus === 'ASSIGNED' ? lead : null;
        },
        'held lead assigned after salesperson created',
        15_000
      );
      expect(String(assigned.userId)).toBe(userId);
      await expect(
        waitFor(async () => harness.redis.get(leadsVersionKey(userId)), 'assignee cache bump')
      ).resolves.toBe('1');
    });
  });
});
