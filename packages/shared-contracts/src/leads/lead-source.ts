export const LEAD_SOURCES = ['INTERNAL', 'EXTERNAL'] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const ASSIGNMENT_STATUSES = ['ASSIGNED', 'UNASSIGNED'] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
