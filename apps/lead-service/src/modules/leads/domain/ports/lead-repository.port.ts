import type { LeadLabel } from '@lead/shared-contracts';

import { IndexableLead, Lead, LeadPage } from '../entities/lead.entity';
import { DateRange } from '../value-objects/date-range';
import { SearchTerm } from '../value-objects/search-term';

export interface LeadListCriteria {
  range: DateRange;
  label?: LeadLabel;
  term?: SearchTerm;
  page: number;
  limit: number;
}

export interface LeadRepositoryPort {
  findOwnedById(userId: string, leadId: string): Promise<Lead | null>;
  markRead(userId: string, leadId: string): Promise<boolean>;
  setLabel(userId: string, leadId: string, label: LeadLabel, at: Date): Promise<Lead | null>;
  touch(userId: string, leadId: string, at: Date): Promise<void>;
  list(userId: string, criteria: LeadListCriteria): Promise<LeadPage>;
  listAllForIndex(userId: string): Promise<IndexableLead[]>;
}

export const LEAD_REPOSITORY_PORT = Symbol('LEAD_REPOSITORY_PORT');
