import type { LeadLabel, LeadSource } from '@lead/shared-contracts';

export interface Lead {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  message: string;
  source: LeadSource;
  label: LeadLabel;
  hasView: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadSummary {
  id: string;
  customerName: string;
  email?: string;
  phone: string;
  label: LeadLabel;
  hasView: boolean;
  lastUpdate: Date;
}

export interface IndexableLead extends LeadSummary {
  fullNameSearch: string;
  emailLower?: string;
  phoneDigits: string;
}

export interface LeadPage {
  items: LeadSummary[];
  total: number;
}
