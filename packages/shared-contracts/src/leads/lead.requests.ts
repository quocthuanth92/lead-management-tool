import type { LeadLabel } from './lead-label';
import type { ActivityType } from './activity-type';

export interface CreateLeadRequest {
  fullName: string;
  phone: string;
  email?: string;
  message: string;
}

export interface ListLeadsQuery {
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface SearchLeadsQuery extends ListLeadsQuery {
  q?: string;
  label?: LeadLabel;
}

export interface SetLabelRequest {
  label: LeadLabel;
}

export interface AddActivityRequest {
  type?: ActivityType;
  content: string;
}
