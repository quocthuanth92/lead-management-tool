import type { AddActivityRequest, LeadActivityItem, PagedResult } from '@lead/shared-contracts';
import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { addLeadActivity } from '@/lib/api/leads-api';
import { leadKeys } from '@/lib/query/keys';

type ActivityCache = InfiniteData<PagedResult<LeadActivityItem>, number>;

export function useAddActivity(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddActivityRequest) => addLeadActivity(leadId, input),
    onSuccess: (created) => {
      queryClient.setQueryData<ActivityCache>(leadKeys.activities(leadId), (cache) => {
        if (!cache || cache.pages.length === 0) {
          return cache;
        }
        const [firstPage, ...rest] = cache.pages;
        return {
          ...cache,
          pages: [
            { ...firstPage, items: [created, ...firstPage.items], total: firstPage.total + 1 },
            ...rest
          ]
        };
      });
      void queryClient.invalidateQueries({ queryKey: leadKeys.details(leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    }
  });
}
