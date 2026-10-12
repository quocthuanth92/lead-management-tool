export const leadKeys = {
  all: ['leads'] as const,
  lists: () => ['leads', 'list'] as const,
  list: (query: object) => ['leads', 'list', query] as const,
  details: (leadId: string) => ['leads', 'details', leadId] as const,
  activities: (leadId: string) => ['leads', 'activities', leadId] as const
};
