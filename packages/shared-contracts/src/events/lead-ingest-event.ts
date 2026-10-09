import { z } from 'zod';

import { LIMITS } from '../leads/limits';

export const leadIngestEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventId: z.string().uuid(),
    occurredAt: z.string().datetime(),
    lead: z
      .object({
        fullName: z.string().trim().min(1).max(LIMITS.FULL_NAME_MAX),
        phone: z.string().trim().min(LIMITS.PHONE_MIN_DIGITS).max(25),
        email: z.string().email().max(LIMITS.EMAIL_MAX).optional(),
        message: z.string().trim().min(1).max(LIMITS.MESSAGE_MAX)
      })
      .strict()
  })
  .strict();

export type LeadIngestEvent = z.infer<typeof leadIngestEventSchema>;

export interface DeadLetterEnvelope {
  originalValue: string;
  originalKey?: string | null;
  reason: 'INVALID_PAYLOAD' | 'PROCESSING_FAILED';
  details?: string[];
  failedAt: string;
  attempts: number;
  sourceTopic: string;
  sourcePartition: number;
  sourceOffset: string;
}

export function parseLeadIngestEvent(
  raw: unknown
): { success: true; data: LeadIngestEvent } | { success: false; issues: string[] } {
  const parsed = leadIngestEventSchema.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'value';
      return `${path}: ${issue.message}`;
    });

    return { success: false, issues };
  }

  return { success: true, data: parsed.data };
}
