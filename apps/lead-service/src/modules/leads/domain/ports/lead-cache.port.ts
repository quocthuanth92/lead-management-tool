import { Lead } from '../entities/lead.entity';

export interface LeadCachePort {
  setPlaceholderLead(lead: Lead): Promise<void>;
}

export const LEAD_CACHE_PORT = Symbol('LEAD_CACHE_PORT');
