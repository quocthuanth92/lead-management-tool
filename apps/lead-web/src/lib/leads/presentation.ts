import type { ActivityType, LeadLabel } from '@lead/shared-contracts';

export const LABEL_TEXT: Record<LeadLabel, string> = {
  UNLABELED: 'Unlabeled',
  POTENTIAL: 'Potential',
  SPAM: 'Spam'
};

export const SOURCE_TEXT: Record<'INTERNAL' | 'EXTERNAL', string> = {
  INTERNAL: 'Website API',
  EXTERNAL: 'External event'
};

export const ACTIVITY_TYPE_TEXT: Record<ActivityType, string> = {
  CALL: 'Call',
  EMAIL: 'Email',
  SMS: 'SMS',
  NOTE: 'Note',
  OTHER: 'Other'
};
