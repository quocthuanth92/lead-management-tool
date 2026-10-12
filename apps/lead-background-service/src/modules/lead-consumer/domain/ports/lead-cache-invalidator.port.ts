export const LEAD_CACHE_INVALIDATOR_PORT = Symbol('LEAD_CACHE_INVALIDATOR_PORT');

export interface LeadCacheInvalidatorPort {
  invalidateLeadWrite(leadId: string, ownerId: string): Promise<void>;
}
