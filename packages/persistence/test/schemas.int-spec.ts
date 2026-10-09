import { Types } from 'mongoose';

import { MongoLeadWriterStore } from '../src';
import {
  buildLead,
  MongoTestContext,
  startMongoTestContext,
  stopMongoTestContext
} from './mongo-test-context';

function stagesOf(plan: unknown): string {
  return JSON.stringify(plan);
}

describe('persistence schemas (integration)', () => {
  let context: MongoTestContext;

  beforeAll(async () => {
    context = await startMongoTestContext();
  });

  afterAll(async () => {
    await stopMongoTestContext(context);
  });

  async function indexesOf(collection: { indexes(): Promise<any[]> }) {
    const indexes = await collection.indexes();
    return indexes.filter((index) => index.name !== '_id_');
  }

  it('creates exactly the declared indexes on leads', async () => {
    const indexes = await indexesOf(context.models.Lead.collection);

    expect(indexes).toHaveLength(3);
    expect(indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: { userId: 1, hasView: 1, updatedAt: -1 } }),
        expect.objectContaining({
          key: { externalEventId: 1 },
          unique: true,
          partialFilterExpression: { externalEventId: { $type: 'string' } }
        }),
        expect.objectContaining({
          key: { createdAt: 1 },
          partialFilterExpression: { assignmentStatus: 'UNASSIGNED' }
        })
      ])
    );
    const createdAtIndex = indexes.find((index) => index.key.createdAt === 1);
    expect(createdAtIndex?.unique).toBeUndefined();
  });

  it('creates the declared indexes on users and lead_activities', async () => {
    const userIndexes = await indexesOf(context.models.User.collection);
    expect(userIndexes).toEqual([expect.objectContaining({ key: { email: 1 }, unique: true })]);

    const activityIndexes = await indexesOf(context.models.LeadActivity.collection);
    expect(activityIndexes).toEqual([
      expect.objectContaining({ key: { leadId: 1, createdAt: -1 } })
    ]);
  });

  it('enforces unique externalEventId only when present', async () => {
    const { Lead } = context.models;
    await Lead.create(buildLead({ externalEventId: 'evt-1' }));

    await expect(Lead.create(buildLead({ externalEventId: 'evt-1' }))).rejects.toMatchObject({
      code: 11000
    });

    await Lead.create(buildLead());
    await Lead.create(buildLead());
    await Lead.create(buildLead({ externalEventId: 'evt-2' }));
    expect(await Lead.countDocuments({ externalEventId: { $exists: false } })).toBeGreaterThanOrEqual(
      2
    );
  });

  it('enforces unique user email, stored lower-case', async () => {
    const { User } = context.models;
    const user = { passwordHash: 'scrypt$salt$hash', fullName: 'Sam Sales' };

    const created = await User.create({ ...user, email: 'Sam@Example.com' });
    expect(created.email).toBe('sam@example.com');
    expect(created.role).toBe('SALESPERSON');
    expect(created.isActive).toBe(true);

    await expect(User.create({ ...user, email: 'sam@example.com' })).rejects.toMatchObject({
      code: 11000
    });
  });

  it('applies lead defaults and does not auto-touch updatedAt', async () => {
    const { Lead } = context.models;
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const lead = await Lead.create(buildLead({ createdAt, updatedAt: createdAt }));

    expect(lead.label).toBe('UNLABELED');
    expect(lead.hasView).toBe(false);
    expect(lead.schemaVersion).toBe(1);

    await Lead.updateOne({ _id: lead._id }, { $set: { hasView: true } });
    const reloaded = await Lead.findById(lead._id).lean();
    expect(reloaded?.updatedAt).toEqual(createdAt);
  });

  it('rejects invalid lead values', async () => {
    const { Lead } = context.models;

    await expect(Lead.create(buildLead({ label: 'HOT' }))).rejects.toThrow();
    await expect(Lead.create(buildLead({ phone: '12' }))).rejects.toThrow();
    await expect(Lead.create(buildLead({ email: 'not-an-email' }))).rejects.toThrow();
    await expect(Lead.create(buildLead({ message: '' }))).rejects.toThrow();
  });

  it('stores activities append-only with defaults', async () => {
    const { LeadActivity } = context.models;
    const activity = await LeadActivity.create({
      leadId: new Types.ObjectId(),
      userId: new Types.ObjectId(),
      authorName: 'Sam Sales',
      content: '  Called the customer  '
    });

    expect(activity.type).toBe('NOTE');
    expect(activity.content).toBe('Called the customer');
    expect(activity.createdAt).toBeInstanceOf(Date);
    expect(activity).not.toHaveProperty('updatedAt');

    await expect(
      LeadActivity.create({
        leadId: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        authorName: 'Sam Sales',
        content: '   '
      })
    ).rejects.toThrow();
  });

  it('TC-17: inbox query uses the compound index with no COLLSCAN and no in-memory SORT', async () => {
    const { Lead } = context.models;
    const owner = new Types.ObjectId();
    const other = new Types.ObjectId();
    const day = 24 * 60 * 60 * 1000;
    const base = Date.now();
    const docs = Array.from({ length: 400 }, (_, i) => {
      const updatedAt = new Date(base - (i % 200) * day);
      return buildLead({
        userId: i % 2 === 0 ? owner : other,
        hasView: i % 3 === 0,
        createdAt: updatedAt,
        updatedAt
      });
    });
    await Lead.insertMany(docs);

    const explain = await Lead.find({
      userId: owner,
      updatedAt: { $gte: new Date(base - 180 * day), $lte: new Date(base) }
    })
      .sort({ hasView: 1, updatedAt: -1 })
      .limit(20)
      .explain('queryPlanner');

    const plan = stagesOf((explain as any).queryPlanner.winningPlan);
    expect(plan).toContain('IXSCAN');
    expect(plan).toContain('userId_1_hasView_1_updatedAt_-1');
    expect(plan).not.toContain('COLLSCAN');
    expect(plan).not.toMatch(/"stage":"SORT/);
  });

  it('hands out 50 distinct assignment sequence values under concurrency', async () => {
    const store = new MongoLeadWriterStore(context.models);

    const values = await Promise.all(Array.from({ length: 50 }, () => store.nextAssignmentSequence()));

    expect(new Set(values).size).toBe(50);
    expect([...values].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });
});
