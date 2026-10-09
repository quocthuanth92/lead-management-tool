import { LeadActivity } from '../entities/lead-activity.entity';

export interface LeadActivityRepositoryPort {
  add(activity: Omit<LeadActivity, 'id'>): Promise<LeadActivity>;
  list(leadId: string, page: number, limit: number): Promise<LeadActivity[]>;
}

export const LEAD_ACTIVITY_REPOSITORY_PORT = Symbol('LEAD_ACTIVITY_REPOSITORY_PORT');
