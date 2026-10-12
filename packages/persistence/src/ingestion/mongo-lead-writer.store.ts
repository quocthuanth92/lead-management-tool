import { Types } from 'mongoose';

import { PersistenceModels } from '../models';
import { LEAD_ASSIGNMENT_COUNTER_ID } from '../schemas/counter.schema';
import {
  ActiveSalesperson,
  DuplicateLeadError,
  LeadWriterStore,
  NewLeadRecord
} from './lead-writer';

const DUPLICATE_KEY_ERROR_CODE = 11000;

function isExternalEventIdDuplicate(error: unknown): boolean {
  const mongoError = error as { code?: number; keyPattern?: Record<string, unknown> };
  return (
    mongoError?.code === DUPLICATE_KEY_ERROR_CODE &&
    mongoError.keyPattern !== undefined &&
    'externalEventId' in mongoError.keyPattern
  );
}

export class MongoLeadWriterStore implements LeadWriterStore {
  constructor(private readonly models: Pick<PersistenceModels, 'User' | 'Lead' | 'Counter'>) {}

  async nextAssignmentSequence(): Promise<number> {
    const counter = await this.models.Counter.findOneAndUpdate(
      { _id: LEAD_ASSIGNMENT_COUNTER_ID },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    ).lean();
    return counter.seq;
  }

  async listActiveSalespeople(): Promise<ActiveSalesperson[]> {
    const users = await this.models.User.find({ role: 'SALESPERSON', isActive: true }, { _id: 1 })
      .sort({ _id: 1 })
      .lean();
    return users.map((user) => ({ id: String(user._id) }));
  }

  async insertLead(record: NewLeadRecord): Promise<{ id: string }> {
    try {
      const lead = await this.models.Lead.create(record);
      return { id: String(lead._id) };
    } catch (error) {
      if (isExternalEventIdDuplicate(error)) {
        throw new DuplicateLeadError();
      }
      throw error;
    }
  }

  async assignHeld(leadId: string, userId: string): Promise<boolean> {
    const result = await this.models.Lead.updateOne(
      { _id: new Types.ObjectId(leadId), assignmentStatus: 'UNASSIGNED' },
      { $set: { userId: new Types.ObjectId(userId), assignmentStatus: 'ASSIGNED' } }
    );
    return result.modifiedCount === 1;
  }
}
