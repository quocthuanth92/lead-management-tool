import { Inject, Injectable } from '@nestjs/common';
import { LeadWriter, PersistenceModels } from '@lead/persistence';

import { LEAD_WRITER, PERSISTENCE_MODELS } from '../../../core/database/database.module';
import { AssignLeadOutcome, HeldLeadsPort } from '../domain/ports/held-leads.port';

@Injectable()
export class MongoHeldLeadsAdapter implements HeldLeadsPort {
  constructor(
    @Inject(PERSISTENCE_MODELS) private readonly models: PersistenceModels,
    @Inject(LEAD_WRITER) private readonly writer: LeadWriter
  ) {}

  async listUnassignedLeadIds(limit: number): Promise<string[]> {
    const leads = await this.models.Lead.find({ assignmentStatus: 'UNASSIGNED' }, { _id: 1 })
      .sort({ createdAt: 1, _id: 1 })
      .limit(limit)
      .lean();
    return leads.map((lead) => String(lead._id));
  }

  async hasActiveSalespeople(): Promise<boolean> {
    const salesperson = await this.models.User.exists({ role: 'SALESPERSON', isActive: true });
    return salesperson !== null;
  }

  async assignLead(leadId: string): Promise<AssignLeadOutcome> {
    const result = await this.writer.assignHeldLead(leadId);
    return result.assigned ? { assigned: true, assigneeId: result.userId } : { assigned: false };
  }
}
