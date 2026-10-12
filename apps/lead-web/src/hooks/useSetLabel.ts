import type { LeadDetails, LeadLabel } from '@lead/shared-contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setLeadLabel } from '@/lib/api/leads-api';
import { leadKeys } from '@/lib/query/keys';

export function useSetLabel(leadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label: LeadLabel) => setLeadLabel(leadId, label),
    onMutate: async (label) => {
      await queryClient.cancelQueries({ queryKey: leadKeys.details(leadId) });
      const previous = queryClient.getQueryData<LeadDetails>(leadKeys.details(leadId));
      queryClient.setQueryData<LeadDetails>(leadKeys.details(leadId), (current) =>
        current ? { ...current, label } : current
      );
      return { previous };
    },
    onError: (_error, _label, context) => {
      if (context?.previous) {
        queryClient.setQueryData(leadKeys.details(leadId), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.details(leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    }
  });
}
