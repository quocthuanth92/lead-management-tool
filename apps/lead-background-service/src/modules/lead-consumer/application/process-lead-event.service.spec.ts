import { Logger } from '@nestjs/common';

import { InvalidLeadError } from '../domain/errors/invalid-lead.error';
import type { DeadLetterPort } from '../domain/ports/dead-letter.port';
import type { LeadCacheInvalidatorPort } from '../domain/ports/lead-cache-invalidator.port';
import type { LeadIngestionPort } from '../domain/ports/lead-ingestion.port';
import { LeadEventMessage, ProcessLeadEventService } from './process-lead-event.service';
import { ConsumerRetryPolicy } from './retry-policy';

const EVENT_ID = '3f2c9a1e-8b7d-4c6e-9f0a-1234567890ab';
const TOPIC = 'leads.incoming';

const FULL_NAME = 'Tran Van An';
const PHONE = '+84 90 123 4567';
const EMAIL = 'an@example.com';
const MESSAGE = 'Test drive please';

const validEvent = {
  schemaVersion: 1,
  eventId: EVENT_ID,
  occurredAt: '2026-10-12T02:00:00.000Z',
  lead: { fullName: FULL_NAME, phone: PHONE, email: EMAIL, message: MESSAGE }
};

function messageOf(value: string, key: string | null = EVENT_ID): LeadEventMessage {
  return { topic: TOPIC, partition: 0, offset: '42', key, value };
}

function transientError(): Error {
  const error = new Error('server selection timed out');
  error.name = 'MongoServerSelectionError';
  return error;
}

describe('ProcessLeadEventService', () => {
  let ingestion: jest.Mocked<LeadIngestionPort>;
  let deadLetters: jest.Mocked<DeadLetterPort>;
  let cache: jest.Mocked<LeadCacheInvalidatorPort>;
  let service: ProcessLeadEventService;

  beforeEach(() => {
    jest.useFakeTimers();
    ingestion = { ingest: jest.fn() } as unknown as jest.Mocked<LeadIngestionPort>;
    deadLetters = { publish: jest.fn().mockResolvedValue(undefined) };
    cache = { invalidateLeadWrite: jest.fn().mockResolvedValue(undefined) };
    service = new ProcessLeadEventService(
      ingestion,
      deadLetters,
      cache,
      new ConsumerRetryPolicy({ attempts: 3, baseDelayMs: 1000 })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ingests a valid event as EXTERNAL keyed by eventId and invalidates the assignee cache', async () => {
    ingestion.ingest.mockResolvedValue({
      status: 'CREATED',
      leadId: 'lead-1',
      assigneeId: 'user-1'
    });

    await service.execute(messageOf(JSON.stringify(validEvent)));

    expect(ingestion.ingest).toHaveBeenCalledTimes(1);
    expect(ingestion.ingest).toHaveBeenCalledWith({
      source: 'EXTERNAL',
      externalEventId: EVENT_ID,
      lead: { fullName: FULL_NAME, phone: PHONE, email: EMAIL, message: MESSAGE }
    });
    expect(cache.invalidateLeadWrite).toHaveBeenCalledWith('lead-1', 'user-1');
    expect(deadLetters.publish).not.toHaveBeenCalled();
  });

  it('does not invalidate any cache when the new lead is held unassigned', async () => {
    ingestion.ingest.mockResolvedValue({ status: 'CREATED', leadId: 'lead-2' });

    await service.execute(messageOf(JSON.stringify(validEvent)));

    expect(cache.invalidateLeadWrite).not.toHaveBeenCalled();
    expect(deadLetters.publish).not.toHaveBeenCalled();
  });

  it('acknowledges a duplicate event silently without invalidation or DLQ', async () => {
    ingestion.ingest.mockResolvedValue({ status: 'DUPLICATE' });

    await expect(service.execute(messageOf(JSON.stringify(validEvent)))).resolves.toBeUndefined();

    expect(ingestion.ingest).toHaveBeenCalledTimes(1);
    expect(cache.invalidateLeadWrite).not.toHaveBeenCalled();
    expect(deadLetters.publish).not.toHaveBeenCalled();
  });

  it('sends a non-JSON payload to the DLQ immediately as INVALID_PAYLOAD without retrying', async () => {
    await service.execute(messageOf('{not json', null));

    expect(ingestion.ingest).not.toHaveBeenCalled();
    expect(deadLetters.publish).toHaveBeenCalledTimes(1);
    expect(deadLetters.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        originalValue: '{not json',
        originalKey: null,
        reason: 'INVALID_PAYLOAD',
        attempts: 1,
        sourceTopic: TOPIC,
        sourcePartition: 0,
        sourceOffset: '42'
      })
    );
  });

  it('sends a schema-invalid payload to the DLQ with validation paths and no retry', async () => {
    const invalid = { ...validEvent, lead: { fullName: FULL_NAME, phone: PHONE, email: EMAIL } };

    await service.execute(messageOf(JSON.stringify(invalid)));

    expect(ingestion.ingest).not.toHaveBeenCalled();
    expect(deadLetters.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'INVALID_PAYLOAD',
        details: [expect.stringMatching(/^lead\.message:/)]
      })
    );
  });

  it('retries transient failures with exponential backoff and dead-letters after the last attempt', async () => {
    ingestion.ingest.mockRejectedValue(transientError());

    const pending = service.execute(messageOf(JSON.stringify(validEvent)));

    await jest.advanceTimersByTimeAsync(0);
    expect(ingestion.ingest).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(999);
    expect(ingestion.ingest).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(ingestion.ingest).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1999);
    expect(ingestion.ingest).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(1);
    await pending;

    expect(ingestion.ingest).toHaveBeenCalledTimes(3);
    expect(deadLetters.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'PROCESSING_FAILED',
        attempts: 3,
        details: ['MongoServerSelectionError']
      })
    );
    expect(cache.invalidateLeadWrite).not.toHaveBeenCalled();
  });

  it('succeeds when a later attempt succeeds and does not dead-letter', async () => {
    ingestion.ingest
      .mockRejectedValueOnce(transientError())
      .mockResolvedValueOnce({ status: 'CREATED', leadId: 'lead-3', assigneeId: 'user-3' });

    const pending = service.execute(messageOf(JSON.stringify(validEvent)));
    await jest.advanceTimersByTimeAsync(1000);
    await pending;

    expect(ingestion.ingest).toHaveBeenCalledTimes(2);
    expect(deadLetters.publish).not.toHaveBeenCalled();
    expect(cache.invalidateLeadWrite).toHaveBeenCalledTimes(1);
    expect(cache.invalidateLeadWrite).toHaveBeenCalledWith('lead-3', 'user-3');
  });

  it('dead-letters a lead rejected by the ingestion adapter as INVALID_PAYLOAD without retrying', async () => {
    ingestion.ingest.mockRejectedValue(
      new InvalidLeadError(['phone: must contain 7 to 20 digits'])
    );

    await service.execute(messageOf(JSON.stringify(validEvent)));

    expect(ingestion.ingest).toHaveBeenCalledTimes(1);
    expect(deadLetters.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'INVALID_PAYLOAD',
        details: ['phone: must contain 7 to 20 digits']
      })
    );
  });

  it('rethrows when the DLQ publish fails so Kafka redelivers the message', async () => {
    deadLetters.publish.mockRejectedValue(new Error('broker unavailable'));

    await expect(service.execute(messageOf('{not json', null))).rejects.toThrow(
      'broker unavailable'
    );

    ingestion.ingest.mockRejectedValue(transientError());
    const pending = service.execute(messageOf(JSON.stringify(validEvent)));
    const settled = pending.catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(3000);
    await expect(settled).resolves.toEqual(new Error('broker unavailable'));
  });

  it('ignores Redis invalidation failures after a successful write', async () => {
    ingestion.ingest.mockResolvedValue({
      status: 'CREATED',
      leadId: 'lead-4',
      assigneeId: 'user-4'
    });
    cache.invalidateLeadWrite.mockRejectedValue(new Error('redis down'));

    await expect(service.execute(messageOf(JSON.stringify(validEvent)))).resolves.toBeUndefined();

    expect(deadLetters.publish).not.toHaveBeenCalled();
  });

  it('logs only identifiers and counts, never customer contact details or message text (TC-18)', async () => {
    const logCalls: unknown[][] = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
        logCalls.push(args);
      });
    }

    ingestion.ingest.mockResolvedValueOnce({
      status: 'CREATED',
      leadId: 'lead-5',
      assigneeId: 'user-5'
    });
    await service.execute(messageOf(JSON.stringify(validEvent)));

    ingestion.ingest.mockResolvedValueOnce({ status: 'DUPLICATE' });
    await service.execute(messageOf(JSON.stringify(validEvent)));

    await service.execute(
      messageOf(JSON.stringify({ ...validEvent, lead: { ...validEvent.lead, phone: '1' } }))
    );

    ingestion.ingest.mockRejectedValue(transientError());
    const pending = service.execute(messageOf(JSON.stringify(validEvent)));
    await jest.advanceTimersByTimeAsync(3000);
    await pending;

    const logged = JSON.stringify(logCalls);
    for (const pii of [FULL_NAME, PHONE, '123 4567', EMAIL, MESSAGE, '90 123']) {
      expect(logged).not.toContain(pii);
    }
    expect(logged).toContain(EVENT_ID);
    expect(logCalls.length).toBeGreaterThan(0);
  });
});
