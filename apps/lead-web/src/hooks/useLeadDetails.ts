import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchLeadDetails } from '@/lib/api/leads-api';
import { ApiError } from '@/lib/api/client';
import { leadKeys } from '@/lib/query/keys';

export function isLeadNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function useLeadDetails(leadId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: leadKeys.details(leadId),
    queryFn: async () => {
      const details = await fetchLeadDetails(leadId);
      // Opening a lead marks it read on the server, so the inbox rows must be refreshed.
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      return details;
    }
  });
}
