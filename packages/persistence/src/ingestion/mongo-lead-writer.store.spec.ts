import { PersistenceModels } from '../models';
import { LEAD_ASSIGNMENT_COUNTER_ID } from '../schemas/counter.schema';
import { DuplicateLeadError, NewLeadRecord } from './lead-writer';
import { MongoLeadWriterStore } from './mongo-lead-writer.store';

type StoreModels = Pick<PersistenceModels, 'User' | 'Lead' | 'Counter'>;

const SALES_ONE = '65a000000000000000000001';
const SALES_TWO = '65a000000000000000000002';
const LEAD_ID = '65b000000000000000000001';

function record(overrides: Partial<NewLeadRecord> = {}): NewLeadRecord {
  return {
    assignmentStatus: 'UNASSIGNED',
    fullName: 'Name',
    phone: '15555550100',
    message: 'Message',
    source: 'EXTERNAL',
    label: 'UNLABELED',
    hasView: false,
    fullNameSearch: 'name',
    phoneDigits: '15555550100',
    schemaVersion: 1,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    ...overrides
  };
}

describe('MongoLeadWriterStore', () => {
  it('increments the assignment counter atomically and returns the new sequence', async () => {
    const lean = jest.fn().mockResolvedValue({ seq: 7 });
    const findOneAndUpdate = jest.fn().mockReturnValue({ lean });
    const store = new MongoLeadWriterStore({
      Counter: { findOneAndUpdate }
    } as unknown as StoreModels);

    await expect(store.nextAssignmentSequence()).resolves.toBe(7);
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: LEAD_ASSIGNMENT_COUNTER_ID },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
  });

  it('lists active salespeople ordered by id', async () => {
    const lean = jest.fn().mockResolvedValue([{ _id: SALES_ONE }, { _id: SALES_TWO }]);
    const sort = jest.fn().mockReturnValue({ lean });
    const find = jest.fn().mockReturnValue({ sort });
    const store = new MongoLeadWriterStore({
      User: { find }
    } as unknown as StoreModels);

    await expect(store.listActiveSalespeople()).resolves.toEqual([
      { id: SALES_ONE },
      { id: SALES_TWO }
    ]);
    expect(find).toHaveBeenCalledWith({ role: 'SALESPERSON', isActive: true }, { _id: 1 });
    expect(sort).toHaveBeenCalledWith({ _id: 1 });
  });

  it('inserts a lead and returns its id', async () => {
    const create = jest.fn().mockResolvedValue({ _id: LEAD_ID });
    const store = new MongoLeadWriterStore({
      Lead: { create }
    } as unknown as StoreModels);

    await expect(store.insertLead(record())).resolves.toEqual({ id: LEAD_ID });
  });

  it('maps a duplicate externalEventId to DuplicateLeadError', async () => {
    const duplicate = Object.assign(new Error('E11000'), {
      code: 11000,
      keyPattern: { externalEventId: 1 }
    });
    const store = new MongoLeadWriterStore({
      Lead: { create: jest.fn().mockRejectedValue(duplicate) }
    } as unknown as StoreModels);

    await expect(store.insertLead(record({ externalEventId: 'evt-1' }))).rejects.toBeInstanceOf(
      DuplicateLeadError
    );
  });

  it('rethrows other write failures unchanged', async () => {
    const otherDuplicate = Object.assign(new Error('E11000 phone'), {
      code: 11000,
      keyPattern: { phone: 1 }
    });
    const store = new MongoLeadWriterStore({
      Lead: { create: jest.fn().mockRejectedValue(otherDuplicate) }
    } as unknown as StoreModels);

    await expect(store.insertLead(record())).rejects.toBe(otherDuplicate);
  });

  it('assigns a held lead only while it is still unassigned', async () => {
    const updateOne = jest
      .fn()
      .mockResolvedValueOnce({ modifiedCount: 1 })
      .mockResolvedValueOnce({ modifiedCount: 0 });
    const store = new MongoLeadWriterStore({
      Lead: { updateOne }
    } as unknown as StoreModels);

    await expect(store.assignHeld(LEAD_ID, SALES_ONE)).resolves.toBe(true);
    await expect(store.assignHeld(LEAD_ID, SALES_ONE)).resolves.toBe(false);
    expect(updateOne.mock.calls[0][0]).toMatchObject({ assignmentStatus: 'UNASSIGNED' });
  });
});
