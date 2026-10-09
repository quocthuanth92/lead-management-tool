export interface PagedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface LeadListItem {
  id: string;
  customerName: string;
  email?: string | null;
  phone: string;
  label: string;
  hasView: boolean;
  lastUpdate: string;
}

export interface LeadActivityItem {
  id: string;
  leadId: string;
  type: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface LeadDetails extends Omit<LeadListItem, 'email'> {
  email?: string | null;
  source: string;
  message: string;
  createdAt: string;
  activities: LeadActivityItem[];
  activitiesTotal: number;
}

export interface SetLabelResponse {
  id: string;
  label: string;
  lastUpdate: string;
}

export interface CreateLeadResponse {
  id: string;
}
