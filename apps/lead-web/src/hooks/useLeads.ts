'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchLeadPage, type LeadPageQuery } from '@/lib/api/leads-api';
import type { InboxParams } from '@/lib/leads/inbox-params';
import { leadKeys } from '@/lib/query/keys';

export function toLeadPageQuery(params: InboxParams): LeadPageQuery {
  return {
    q: params.q || undefined,
    label: params.label || undefined,
    fromDate: params.from,
    toDate: params.to,
    page: params.page,
    limit: params.limit
  };
}

export function useLeads(params: InboxParams) {
  const query = toLeadPageQuery(params);
  return useQuery({
    queryKey: leadKeys.list(query),
    queryFn: () => fetchLeadPage(query),
    placeholderData: keepPreviousData
  });
}
