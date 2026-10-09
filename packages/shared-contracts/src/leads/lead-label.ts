export const LEAD_LABELS = ['UNLABELED', 'POTENTIAL', 'SPAM'] as const;

export type LeadLabel = (typeof LEAD_LABELS)[number];

export const DEFAULT_LEAD_LABEL: LeadLabel = 'UNLABELED';
