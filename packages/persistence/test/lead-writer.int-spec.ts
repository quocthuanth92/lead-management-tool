import { LeadWriter, MongoLeadWriterStore } from '../src';
import {
  MongoTestContext,
  startMongoTestContext,
  stopMongoTestContext
} from './mongo-test-context';

describe('LeadWriter with MongoLeadWriterStore (integration)', () => {
  let context: MongoTestContext;
  let writer: LeadWriter;

  beforeAll(async () => {
    context = await startMongoTestContext();
    writer = new LeadWriter(new MongoLeadWriterStore(context.models));
  });

  afterAll(async () => {
    await stopMongoTestContext(context);
  });

  const input = {
    fullName: 'Nguyễn Văn An',
    phone: '(555) 123-4567',
    email: 'An@Example.com',
    message: 'Hello'
  };

  beforeEach(async () => {
    await context.models.Lead.deleteMany({});
    await context.models.User.deleteMany({});
    await context.models.Counter.deleteMany({});
  });

  async function createUsers(count: number, overrides: Record<string, unknown> = {}) {
    const users = [];
    for (let i = 0; i < count; i += 1) {
      users.push(
        await context.models.User.create({
          email: `sales${i}-${Date.now()}@example.com`,
          passwordHash: 'scrypt$salt$hash',
          fullName: `Sales ${i}`,
          ...overrides
        })
      );
    }
    return users;
  }

  it('assigns round-robin by _id order and skips inactive or non-salespeople', async () => {
    const active = await createUsers(3);
    await createUsers(1, { isActive: false });
    await createUsers(1, { role: 'ADMIN' });

    const owners: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const result = await writer.writeLead(input, { source: 'INTERNAL' });
      if (result.duplicate) throw new Error('unexpected duplicate');
      owners.push(result.userId as string);
    }

    const ids = active.map((user) => String(user._id));
    expect(owners).toEqual([ids[0], ids[1], ids[2], ids[0]]);
  });

  it('stores normalized, searchable and defaulted fields', async () => {
    const [user] = await createUsers(1);

    const result = await writer.writeLead(input, { source: 'EXTERNAL', externalEventId: 'evt-1' });
    if (result.duplicate) throw new Error('unexpected duplicate');

    const lead = await context.models.Lead.findById(result.id).lean();
    expect(lead).toMatchObject({
      userId: user?._id,
      assignmentStatus: 'ASSIGNED',
      phone: '5551234567',
      phoneDigits: '5551234567',
      fullNameSearch: 'nguyen van an',
      emailLower: 'an@example.com',
      source: 'EXTERNAL',
      label: 'UNLABELED',
      hasView: false,
      externalEventId: 'evt-1'
    });
    expect(lead?.updatedAt).toEqual(lead?.createdAt);
  });

  it('maps a duplicate externalEventId to { duplicate: true }', async () => {
    await createUsers(1);
    const context1 = { source: 'EXTERNAL' as const, externalEventId: 'evt-dup' };

    const first = await writer.writeLead(input, context1);
    const second = await writer.writeLead(input, context1);

    expect(first.duplicate).toBe(false);
    expect(second).toEqual({ duplicate: true });
    expect(await context.models.Lead.countDocuments({ externalEventId: 'evt-dup' })).toBe(1);
  });

  it('holds the lead UNASSIGNED without userId and assigns it later exactly once', async () => {
    const result = await writer.writeLead(input, { source: 'INTERNAL' });
    if (result.duplicate) throw new Error('unexpected duplicate');
    const held = await context.models.Lead.findById(result.id).lean();
    expect(held?.assignmentStatus).toBe('UNASSIGNED');
    expect(held).not.toHaveProperty('userId');
    expect(await writer.assignHeldLead(result.id)).toEqual({ assigned: false });

    const [user] = await createUsers(1);
    expect(await writer.assignHeldLead(result.id)).toEqual({
      assigned: true,
      userId: String(user?._id)
    });
    expect(await writer.assignHeldLead(result.id)).toEqual({ assigned: false });

    const assigned = await context.models.Lead.findById(result.id).lean();
    expect(assigned).toMatchObject({ userId: user?._id, assignmentStatus: 'ASSIGNED' });
  });

  it('spreads concurrent writes evenly across salespeople', async () => {
    const users = await createUsers(3);

    const results = await Promise.all(
      Array.from({ length: 30 }, () => writer.writeLead(input, { source: 'INTERNAL' }))
    );

    expect(results.every((result) => !result.duplicate)).toBe(true);
    for (const user of users) {
      expect(await context.models.Lead.countDocuments({ userId: user._id })).toBe(10);
    }
  });
});
