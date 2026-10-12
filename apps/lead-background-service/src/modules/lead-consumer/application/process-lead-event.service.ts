import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseLeadIngestEvent } from '@lead/shared-contracts';
import type { DeadLetterEnvelope, LeadIngestEvent } from '@lead/shared-contracts';

import { InvalidLeadError } from '../domain/errors/invalid-lead.error';
import { DEAD_LETTER_PORT, DeadLetterPort } from '../domain/ports/dead-letter.port';
import {
  LEAD_CACHE_INVALIDATOR_PORT,
  LeadCacheInvalidatorPort
} from '../domain/ports/lead-cache-invalidator.port';
import { LEAD_INGESTION_PORT, LeadIngestionPort } from '../domain/ports/lead-ingestion.port';
import { ConsumerRetryPolicy } from './retry-policy';

export interface LeadEventMessage {
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
  value: string;
}

type ParseOutcome = { ok: true; event: LeadIngestEvent } | { ok: false; issues: string[] };

@Injectable()
export class ProcessLeadEventService {
  private readonly logger = new Logger(ProcessLeadEventService.name);

  constructor(
    @Inject(LEAD_INGESTION_PORT) private readonly ingestion: LeadIngestionPort,
    @Inject(DEAD_LETTER_PORT) private readonly deadLetters: DeadLetterPort,
    @Inject(LEAD_CACHE_INVALIDATOR_PORT) private readonly cache: LeadCacheInvalidatorPort,
    private readonly retryPolicy: ConsumerRetryPolicy
  ) {}

  async execute(message: LeadEventMessage): Promise<void> {
    const parsed = parseMessage(message.value);
    if (parsed.ok === false) {
      this.logger.warn(
        `Event at ${sourceRef(message)} is invalid (issues=${parsed.issues.length}); sending to DLQ`
      );
      await this.deadLetter(message, 'INVALID_PAYLOAD', parsed.issues, 1);
      return;
    }

    const { event } = parsed;
    const outcome = await this.ingestOrDeadLetter(message, event);
    if (!outcome) {
      return;
    }

    if (outcome.status === 'DUPLICATE') {
      this.logger.log(`Event ${event.eventId} already processed; acknowledged`);
      return;
    }

    this.logger.log(
      `Event ${event.eventId} stored as lead ${outcome.leadId} (assigned=${outcome.assigneeId !== undefined})`
    );
    if (outcome.assigneeId !== undefined) {
      await this.invalidateCache(outcome.leadId, outcome.assigneeId, event.eventId);
    }
  }

  private async ingestOrDeadLetter(
    message: LeadEventMessage,
    event: LeadIngestEvent
  ): Promise<IngestOutcome | undefined> {
    const maxAttempts = this.retryPolicy.maxAttempts;

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.ingestion.ingest({
          source: 'EXTERNAL',
          externalEventId: event.eventId,
          lead: {
            fullName: event.lead.fullName,
            phone: event.lead.phone,
            ...(event.lead.email !== undefined ? { email: event.lead.email } : {}),
            message: event.lead.message
          }
        });
      } catch (error) {
        if (error instanceof InvalidLeadError) {
          this.logger.warn(
            `Event ${event.eventId} rejected by lead validation (issues=${error.issues.length}); sending to DLQ`
          );
          await this.deadLetter(message, 'INVALID_PAYLOAD', error.issues, attempt);
          return undefined;
        }

        const errorName = errorNameOf(error);
        if (attempt >= maxAttempts) {
          this.logger.error(
            `Event ${event.eventId} failed after ${attempt} attempts (error=${errorName}); sending to DLQ`
          );
          await this.deadLetter(message, 'PROCESSING_FAILED', [errorName], attempt);
          return undefined;
        }

        this.logger.warn(
          `Event ${event.eventId} attempt ${attempt}/${maxAttempts} failed (error=${errorName}); retrying`
        );
        await this.retryPolicy.waitBeforeRetry(attempt);
      }
    }
  }

  private async invalidateCache(leadId: string, ownerId: string, eventId: string): Promise<void> {
    try {
      await this.cache.invalidateLeadWrite(leadId, ownerId);
    } catch (error) {
      this.logger.warn(
        `Cache invalidation failed for lead ${leadId} of event ${eventId} (error=${errorNameOf(error)})`
      );
    }
  }

  private deadLetter(
    message: LeadEventMessage,
    reason: DeadLetterEnvelope['reason'],
    details: string[],
    attempts: number
  ): Promise<void> {
    return this.deadLetters.publish({
      originalValue: message.value,
      originalKey: message.key,
      reason,
      details,
      failedAt: new Date().toISOString(),
      attempts,
      sourceTopic: message.topic,
      sourcePartition: message.partition,
      sourceOffset: message.offset
    });
  }
}

type IngestOutcome = Awaited<ReturnType<LeadIngestionPort['ingest']>>;

function parseMessage(value: string): ParseOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return { ok: false, issues: ['payload: not valid JSON'] };
  }

  const result = parseLeadIngestEvent(raw);
  return result.success === true
    ? { ok: true, event: result.data }
    : { ok: false, issues: result.issues };
}

function sourceRef(message: LeadEventMessage): string {
  return `${message.topic}/${message.partition}@${message.offset}`;
}

function errorNameOf(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
