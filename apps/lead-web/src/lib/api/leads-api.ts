import type {
  AddActivityRequest,
  LeadActivityItem,
  LeadDetails,
  LeadLabel,
  LeadListItem,
  PagedResult,
  SetLabelResponse
} from '@lead/shared-contracts';

import { apiClient, buildQueryString } from './client';

export interface LeadPageQuery {
  q?: string;
  label?: LeadLabel;
  fromDate: string;
  toDate: string;
  page: number;
  limit: number;
}

export function fetchLeadPage(query: LeadPageQuery): Promise<PagedResult<LeadListItem>> {
  const isSearch = Boolean(query.q) || Boolean(query.label);
  const { q, label, ...rangeAndPaging } = query;
  const params = isSearch ? { ...rangeAndPaging, q, label } : rangeAndPaging;
  return apiClient.get(`/leads${isSearch ? '/search' : ''}${buildQueryString(params)}`);
}

export function fetchLeadDetails(leadId: string): Promise<LeadDetails> {
  return apiClient.get(`/leads/${encodeURIComponent(leadId)}`);
}

export function fetchLeadActivities(
  leadId: string,
  page: number,
  limit: number
): Promise<PagedResult<LeadActivityItem>> {
  return apiClient.get(
    `/leads/${encodeURIComponent(leadId)}/activities${buildQueryString({ page, limit })}`
  );
}

export function setLeadLabel(leadId: string, label: LeadLabel): Promise<SetLabelResponse> {
  return apiClient.put(`/leads/${encodeURIComponent(leadId)}/label`, { label });
}

export function addLeadActivity(
  leadId: string,
  input: AddActivityRequest
): Promise<LeadActivityItem> {
  return apiClient.post(`/leads/${encodeURIComponent(leadId)}/activities`, input);
}
