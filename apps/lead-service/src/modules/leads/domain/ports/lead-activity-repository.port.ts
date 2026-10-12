import { LeadActivity } from '../entities/lead-activity.entity';

export interface LeadActivityPage {
  items: LeadActivity[];
  total: number;
}

export interface LeadActivityRepositoryPort {
  add(activity: Omit<LeadActivity, 'id'>): Promise<LeadActivity>;
  list(leadId: string, page: number, limit: number): Promise<LeadActivityPage>;
}

export const LEAD_ACTIVITY_REPOSITORY_PORT = Symbol('LEAD_ACTIVITY_REPOSITORY_PORT');
