export const LIMITS = {
  FULL_NAME_MAX: 120,
  PHONE_MIN_DIGITS: 7,
  PHONE_MAX_DIGITS: 20,
  EMAIL_MAX: 254,
  MESSAGE_MAX: 2000,
  NOTE_MAX: 2000,
  SEARCH_MIN: 2,
  SEARCH_MAX: 100
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 200,
  ACTIVITIES_IN_DETAILS: 50
} as const;

export const MAX_LIMIT = PAGINATION.MAX_LIMIT;
export const DEFAULT_RANGE_MONTHS = 6;

export const KAFKA_TOPICS = {
  LEADS_INCOMING: 'leads.incoming',
  LEADS_DLQ: 'leads.incoming.dlq'
} as const;
