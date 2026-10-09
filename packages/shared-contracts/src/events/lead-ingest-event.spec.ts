import { leadIngestEventSchema, parseLeadIngestEvent } from './lead-ingest-event';

describe('leadIngestEventSchema', () => {
  const validEvent = {
    schemaVersion: 1,
    eventId: '123e4567-e89b-12d3-a456-426614174000',
    occurredAt: '2025-01-01T00:00:00.000Z',
    lead: {
      fullName: 'Jane Doe',
      phone: '+1 (555) 123-4567',
      email: 'jane@example.com',
      message: 'Interested in a test drive.'
    }
  };

  it('accepts a valid event', () => {
    expect(leadIngestEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it.each([
    ['schemaVersion', { ...validEvent, schemaVersion: undefined }],
    ['eventId', { ...validEvent, eventId: 'not-a-uuid' }],
    ['occurredAt', { ...validEvent, occurredAt: 'not-a-date' }],
    ['lead.fullName', { ...validEvent, lead: { ...validEvent.lead, fullName: '' } }],
    ['lead.phone', { ...validEvent, lead: { ...validEvent.lead, phone: '123' } }],
    ['lead.message', { ...validEvent, lead: { ...validEvent.lead, message: '' } }],
    ['unknown key', { ...validEvent, unknown: true }]
  ])('rejects %s', (_label, input) => {
    expect(leadIngestEventSchema.safeParse(input).success).toBe(false);
  });

  it('rejects oversized values', () => {
    const oversized = {
      ...validEvent,
      lead: {
        ...validEvent.lead,
        fullName: 'a'.repeat(121),
        message: 'b'.repeat(2001),
        phone: '9'.repeat(26)
      }
    };

    expect(leadIngestEventSchema.safeParse(oversized).success).toBe(false);
  });

  it('rejects invalid email', () => {
    const invalidEmail = {
      ...validEvent,
      lead: {
        ...validEvent.lead,
        email: 'not-an-email'
      }
    };

    expect(leadIngestEventSchema.safeParse(invalidEmail).success).toBe(false);
  });
});

describe('parseLeadIngestEvent', () => {
  it('returns issues without echoing values', () => {
    const result = parseLeadIngestEvent({
      schemaVersion: 2,
      eventId: 'not-a-uuid',
      occurredAt: 'oops',
      lead: { fullName: 'A', phone: '123', message: 'B', email: 'secret@example.com' }
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.issues.join(' ')).not.toContain('secret@example.com');
      expect(result.issues.join(' ')).not.toContain('not-a-uuid');
      expect(result.issues.join(' ')).toMatch(/schemaVersion|eventId|occurredAt|lead\.phone|lead\.message|lead\.fullName/);
    }
  });

  it('returns parsed data for valid payloads', () => {
    const result = parseLeadIngestEvent({
      schemaVersion: 1,
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      occurredAt: '2025-01-01T00:00:00.000Z',
      lead: {
        fullName: 'Jane Doe',
        phone: '+1 (555) 123-4567',
        email: 'jane@example.com',
        message: 'Interested.'
      }
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lead.email).toBe('jane@example.com');
    }
  });
});
