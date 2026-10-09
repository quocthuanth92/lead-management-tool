import { Lead } from '../entities/lead.entity';

export interface LeadRepositoryPort {
  createPlaceholder(lead: Omit<Lead, 'id'>): Promise<Lead>;
}

export const LEAD_REPOSITORY_PORT = Symbol('LEAD_REPOSITORY_PORT');
