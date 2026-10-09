export interface CachedLead {
  userId: string;
}

export interface LeadCachePort {
  getList<T>(userId: string, query: unknown): Promise<T | null>;
  setList<T>(userId: string, query: unknown, value: T): Promise<void>;
  getLead<T extends CachedLead>(id: string): Promise<T | null>;
  setLead<T extends CachedLead>(id: string, lead: T): Promise<void>;
  invalidateLead(id: string): Promise<void>;
  invalidateUserLists(userId: string): Promise<void>;
}

export const LEAD_CACHE_PORT = Symbol('LEAD_CACHE_PORT');
