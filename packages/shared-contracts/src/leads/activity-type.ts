export const ACTIVITY_TYPES = ['CALL', 'EMAIL', 'SMS', 'NOTE', 'OTHER'] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const DEFAULT_ACTIVITY_TYPE: ActivityType = 'NOTE';
