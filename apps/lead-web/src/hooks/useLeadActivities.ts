import type { LeadActivityItem, PagedResult } from '@lead/shared-contracts';
import { PAGINATION } from '@lead/shared-contracts';
import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchLeadActivities } from '@/lib/api/leads-api';
import { leadKeys } from '@/lib/query/keys';

const FIRST_PAGE: number = PAGINATION.DEFAULT_PAGE;

export function useLeadActivities(leadId: string, initial?: PagedResult<LeadActivityItem>) {
  return useInfiniteQuery({
    queryKey: leadKeys.activities(leadId),
    queryFn: ({ pageParam }) =>
      fetchLeadActivities(leadId, pageParam, PAGINATION.ACTIVITIES_IN_DETAILS),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
    initialData: initial ? { pages: [initial], pageParams: [FIRST_PAGE] } : undefined
  });
}
