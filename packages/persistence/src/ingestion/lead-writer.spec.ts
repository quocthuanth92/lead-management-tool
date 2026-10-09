import {
  ActiveSalesperson,
  DuplicateLeadError,
  LeadWriter,
  LeadWriterStore,
  NewLeadRecord
} from './lead-writer';

class FakeStore implements LeadWriterStore {
  sequence = 0;
  inserted: NewLeadRecord[] = [];
  held = new Map<string, string>();
  duplicateIds = new Set<string>();
  sequenceCalls = 0;

  constructor(public salespeople: ActiveSalesperson[]) {}

  async nextAssignmentSequence(): Promise<number> {
    this.sequenceCalls += 1;
    await Promise.resolve();
    this.sequence += 1;
    return this.sequence;
  }

  async listActiveSalespeople(): Promise<ActiveSalesperson[]> {
    return this.salespeople;
  }

  async insertLead(record: NewLeadRecord): Promise<{ id: string }> {
    if (record.externalEventId && this.duplicateIds.has(record.externalEventId)) {
      throw new DuplicateLeadError();
    }
    if (record.externalEventId) {
      this.duplicateIds.add(record.externalEventId);
    }
    this.inserted.push(record);
    return { id: `lead-${this.inserted.length}` };
  }

  async assignHeld(leadId: string, userId: string): Promise<boolean> {
    if (this.held.has(leadId)) {
      return false;
    }
    this.held.set(leadId, userId);
    return true;
  }
}

const input = { fullName: 'Ann Lee', phone: '(555) 123-4567', email: 'Ann@Example.com', message: 'Hi' };
const now = new Date('2026-01-02T03:04:05.000Z');
const salespeople = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function createWriter(store: FakeStore) {
  return new LeadWriter(store, () => now);
}

describe('LeadWriter', () => {
  it('assigns round-robin in order and wraps around', async () => {
    const store = new FakeStore(salespeople);
    const writer = createWriter(store);

    const owners: Array<string | undefined> = [];
    for (let i = 0; i < 4; i += 1) {
      const result = await writer.writeLead(input, { source: 'INTERNAL' });
      owners.push(result.duplicate ? undefined : result.userId);
    }

    expect(owners).toEqual(['a', 'b', 'c', 'a']);
  });

  it('skips inactive users by only using the active list from the store', async () => {
    const store = new FakeStore([{ id: 'b' }, { id: 'c' }]);
    const writer = createWriter(store);

    const first = await writer.writeLead(input, { source: 'INTERNAL' });
    const second = await writer.writeLead(input, { source: 'INTERNAL' });
    const third = await writer.writeLead(input, { source: 'INTERNAL' });

    expect([first, second, third].map((r) => (r.duplicate ? undefined : r.userId))).toEqual([
      'b',
      'c',
      'b'
    ]);
  });

  it('stores the lead as UNASSIGNED without userId when no salesperson is active', async () => {
    const store = new FakeStore([]);
    const writer = createWriter(store);

    const result = await writer.writeLead(input, { source: 'EXTERNAL' });

    expect(result).toEqual({ id: 'lead-1', duplicate: false });
    expect(store.inserted[0]?.assignmentStatus).toBe('UNASSIGNED');
    expect(store.inserted[0]).not.toHaveProperty('userId');
    expect(store.sequenceCalls).toBe(0);
  });

  it('never reuses a sequence slot under concurrent writes', async () => {
    const store = new FakeStore(salespeople);
    const writer = createWriter(store);

    const results = await Promise.all(
      Array.from({ length: 6 }, () => writer.writeLead(input, { source: 'INTERNAL' }))
    );

    const counts = new Map<string, number>();
    for (const result of results) {
      if (!result.duplicate && result.userId) {
        counts.set(result.userId, (counts.get(result.userId) ?? 0) + 1);
      }
    }
    expect(store.sequence).toBe(6);
    expect([...counts.values()]).toEqual([2, 2, 2]);
  });

  it('reports a duplicate externalEventId without throwing', async () => {
    const store = new FakeStore(salespeople);
    const writer = createWriter(store);
    const context = { source: 'EXTERNAL' as const, externalEventId: 'evt-1' };

    const first = await writer.writeLead(input, context);
    const second = await writer.writeLead(input, context);

    expect(first.duplicate).toBe(false);
    expect(second).toEqual({ duplicate: true });
    expect(store.inserted).toHaveLength(1);
  });

  it('rethrows unexpected store errors', async () => {
    const store = new FakeStore(salespeople);
    store.insertLead = async () => {
      throw new Error('boom');
    };

    await expect(createWriter(store).writeLead(input, { source: 'INTERNAL' })).rejects.toThrow(
      'boom'
    );
  });

  it('writes defaults and normalized search fields', async () => {
    const store = new FakeStore(salespeople);

    await createWriter(store).writeLead(input, { source: 'INTERNAL' });

    expect(store.inserted[0]).toEqual({
      userId: 'a',
      assignmentStatus: 'ASSIGNED',
      fullName: 'Ann Lee',
      phone: '5551234567',
      email: 'Ann@Example.com',
      message: 'Hi',
      source: 'INTERNAL',
      label: 'UNLABELED',
      hasView: false,
      fullNameSearch: 'ann lee',
      emailLower: 'ann@example.com',
      phoneDigits: '5551234567',
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now
    });
  });

  it('stores externalEventId and omits email fields when absent', async () => {
    const store = new FakeStore(salespeople);

    await createWriter(store).writeLead(
      { fullName: 'Bo', phone: '+84 912 345 678', message: 'Hello' },
      { source: 'EXTERNAL', externalEventId: 'evt-9' }
    );

    const record = store.inserted[0];
    expect(record?.externalEventId).toBe('evt-9');
    expect(record?.phone).toBe('+84912345678');
    expect(record).not.toHaveProperty('email');
    expect(record).not.toHaveProperty('emailLower');
  });

  it('rejects an invalid phone number', async () => {
    const store = new FakeStore(salespeople);

    await expect(
      createWriter(store).writeLead({ ...input, phone: '12' }, { source: 'INTERNAL' })
    ).rejects.toThrow(/phone/i);
    expect(store.inserted).toHaveLength(0);
  });

  describe('assignHeldLead', () => {
    it('assigns a held lead to the next salesperson', async () => {
      const store = new FakeStore(salespeople);

      const result = await createWriter(store).assignHeldLead('lead-x');

      expect(result).toEqual({ assigned: true, userId: 'a' });
      expect(store.held.get('lead-x')).toBe('a');
    });

    it('does nothing when no salesperson is active', async () => {
      const store = new FakeStore([]);

      expect(await createWriter(store).assignHeldLead('lead-x')).toEqual({ assigned: false });
    });

    it('reports not assigned when the lead was already assigned', async () => {
      const store = new FakeStore(salespeople);
      store.held.set('lead-x', 'z');

      expect(await createWriter(store).assignHeldLead('lead-x')).toEqual({ assigned: false });
    });
  });
});
