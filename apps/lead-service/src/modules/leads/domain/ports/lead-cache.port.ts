import type { LeadLabel, LeadSource } from '@lead/shared-contracts';

export interface CachedLeadRecord {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  email: string | null;
  message: string;
  source: LeadSource;
  label: LeadLabel;
  hasView: boolean;
  createdAt: string;
  lastUpdate: string;
}

export interface LeadCachePort {
  getVersion(userId: string): Promise<number>;
  getList<T>(userId: string, version: number, query: unknown): Promise<T | null>;
  setList<T>(userId: string, version: number, query: unknown, value: T): Promise<void>;
  getLead(id: string): Promise<CachedLeadRecord | null>;
  setLead(id: string, lead: CachedLeadRecord): Promise<void>;
  invalidateLead(id: string): Promise<void>;
  invalidateUserLists(userId: string): Promise<void>;
}

export const LEAD_CACHE_PORT = Symbol('LEAD_CACHE_PORT');
