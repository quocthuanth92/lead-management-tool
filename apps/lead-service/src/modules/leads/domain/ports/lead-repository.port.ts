import { Lead } from '../entities/lead.entity';

export interface LeadRepositoryPort {
  findById(id: string): Promise<Lead | null>;
}

export const LEAD_REPOSITORY_PORT = Symbol('LEAD_REPOSITORY_PORT');
