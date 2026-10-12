import { IndexableLead, LeadPage } from '../entities/lead.entity';
import { LeadListCriteria } from './lead-repository.port';

export interface LeadSearchIndexPort {
  search(
    userId: string,
    version: number,
    criteria: LeadListCriteria,
    loadLeads: () => Promise<IndexableLead[]>
  ): Promise<LeadPage | null>;
}

export const LEAD_SEARCH_INDEX_PORT = Symbol('LEAD_SEARCH_INDEX_PORT');
