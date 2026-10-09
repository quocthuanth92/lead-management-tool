import {
  AssignmentStatus,
  DEFAULT_LEAD_LABEL,
  LeadLabel,
  LeadSource
} from '@lead/shared-contracts';

import { buildSearchFields, normalizePhone } from '../normalization';

export const LEAD_SCHEMA_VERSION = 1;

export interface LeadWriteInput {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}

export interface LeadWriteContext {
  source: LeadSource;
  externalEventId?: string;
}

export type LeadWriteResult =
  | { duplicate: true }
  | { duplicate: false; id: string; userId?: string };

export type AssignHeldResult = { assigned: false } | { assigned: true; userId: string };

export interface ActiveSalesperson {
  id: string;
}

export interface NewLeadRecord {
  userId?: string;
  assignmentStatus: AssignmentStatus;
  fullName: string;
  phone: string;
  email?: string;
  message: string;
  source: LeadSource;
  label: LeadLabel;
  hasView: boolean;
  fullNameSearch: string;
  emailLower?: string;
  phoneDigits: string;
  externalEventId?: string;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export class DuplicateLeadError extends Error {
  constructor() {
    super('Lead with the same externalEventId already exists');
    this.name = 'DuplicateLeadError';
  }
}

export interface LeadWriterStore {
  nextAssignmentSequence(): Promise<number>;
  listActiveSalespeople(): Promise<ActiveSalesperson[]>;
  insertLead(record: NewLeadRecord): Promise<{ id: string }>;
  assignHeld(leadId: string, userId: string): Promise<boolean>;
}

export class LeadWriter {
  constructor(
    private readonly store: LeadWriterStore,
    private readonly clock: () => Date = () => new Date()
  ) {}

  async writeLead(input: LeadWriteInput, context: LeadWriteContext): Promise<LeadWriteResult> {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new Error('Invalid phone number');
    }

    const userId = await this.pickSalesperson();
    const now = this.clock();
    const record: NewLeadRecord = {
      ...(userId ? { userId } : {}),
      assignmentStatus: userId ? 'ASSIGNED' : 'UNASSIGNED',
      fullName: input.fullName,
      phone,
      ...(input.email ? { email: input.email } : {}),
      message: input.message,
      source: context.source,
      label: DEFAULT_LEAD_LABEL,
      hasView: false,
      ...buildSearchFields({ fullName: input.fullName, email: input.email, phone }),
      ...(context.externalEventId ? { externalEventId: context.externalEventId } : {}),
      schemaVersion: LEAD_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now
    };

    try {
      const { id } = await this.store.insertLead(record);
      return { duplicate: false, id, ...(userId ? { userId } : {}) };
    } catch (error) {
      if (error instanceof DuplicateLeadError) {
        return { duplicate: true };
      }
      throw error;
    }
  }

  async assignHeldLead(leadId: string): Promise<AssignHeldResult> {
    const userId = await this.pickSalesperson();
    if (!userId || !(await this.store.assignHeld(leadId, userId))) {
      return { assigned: false };
    }
    return { assigned: true, userId };
  }

  private async pickSalesperson(): Promise<string | undefined> {
    const salespeople = await this.store.listActiveSalespeople();
    if (salespeople.length === 0) {
      return undefined;
    }
    const sequence = await this.store.nextAssignmentSequence();
    return salespeople[(sequence - 1) % salespeople.length]?.id;
  }
}
