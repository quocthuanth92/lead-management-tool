import type { LeadLabel } from './lead-label';
import type { ActivityType } from './activity-type';
import type { LeadSource } from './lead-source';

export interface LeadSummary {
  id: string;
  fullName: string;
  email?: string;
  phone: string;
  source: LeadSource;
  label: LeadLabel;
  message: string;
  hasView: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivityEntry {
  id: string;
  type: ActivityType;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface LeadDetail extends LeadSummary {
  activities: LeadActivityEntry[];
}

export interface LeadListResponse {
  items: LeadSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadActivityResponse {
  activity: LeadActivityEntry;
}

export interface LeadLabelResponse {
  label: LeadLabel;
}
