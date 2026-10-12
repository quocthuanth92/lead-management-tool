import { randomBytes, randomUUID } from 'node:crypto';

import { Kafka, logLevel } from 'kafkajs';

import { config } from './config';
import type { LeadPayload } from './api-client';

export interface LeadIngestEvent {
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  lead: LeadPayload;
}

export interface DeadLetterEnvelope {
  originalValue: string;
  reason: string;
  sourceTopic: string;
}

function createKafka(clientId: string): Kafka {
  return new Kafka({ clientId, brokers: config.kafkaBrokers, logLevel: logLevel.NOTHING });
}

export function buildLeadEvent(lead: LeadPayload, eventId: string = randomUUID()): LeadIngestEvent {
  return {
    schemaVersion: 1,
    eventId,
    occurredAt: new Date().toISOString(),
    lead: { fullName: lead.fullName, phone: lead.phone, email: lead.email, message: lead.message }
  };
}

export async function publishRawMessage(value: string, key?: string): Promise<void> {
  const producer = createKafka('lead-e2e-producer').producer();
  await producer.connect();
  try {
    await producer.send({ topic: config.ingestTopic, messages: [{ key, value }] });
  } finally {
    await producer.disconnect();
  }
}

export function publishLeadEvent(event: LeadIngestEvent): Promise<void> {
  return publishRawMessage(JSON.stringify(event), event.eventId);
}

// Reads the dead-letter topic from the beginning and resolves with the first envelope whose
// original payload contains the marker, or undefined when none arrives before the timeout.
export async function findDeadLetter(
  marker: string,
  timeoutMs: number
): Promise<DeadLetterEnvelope | undefined> {
  const consumer = createKafka('lead-e2e-dlq-reader').consumer({
    groupId: `lead-e2e-dlq-${randomUUID()}`
  });
  await consumer.connect();
  try {
    await consumer.subscribe({ topic: config.deadLetterTopic, fromBeginning: true });
    return await new Promise<DeadLetterEnvelope | undefined>((resolve, reject) => {
      const timer = setTimeout(() => resolve(undefined), timeoutMs);
      consumer
        .run({
          eachMessage: async ({ message }) => {
            const raw = message.value?.toString('utf8') ?? '';
            if (raw.includes(marker)) {
              clearTimeout(timer);
              resolve(JSON.parse(raw) as DeadLetterEnvelope);
            }
          }
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  } finally {
    await consumer.disconnect();
  }
}

export function randomDigits(length: number): string {
  let digits = '';
  for (const byte of randomBytes(length)) {
    digits += String(byte % 10);
  }
  return digits;
}
