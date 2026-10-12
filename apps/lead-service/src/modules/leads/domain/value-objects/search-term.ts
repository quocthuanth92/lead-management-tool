import { foldText } from '@lead/persistence';
import { LIMITS } from '@lead/shared-contracts';

import { InvalidQueryError } from '../errors/invalid-query.error';

export interface SearchTerm {
  raw: string;
  nameTokens: string[];
  emailFragment?: string;
  phoneDigits?: string;
}

const NON_TOKEN_CHARS = /[^\p{L}\p{N}]+/gu;
const MIN_TOKEN_LENGTH = 2;
const MIN_PHONE_DIGITS = 3;

export function parseSearchTerm(input: string): SearchTerm {
  const raw = input.trim();
  if (raw.length < LIMITS.SEARCH_MIN || raw.length > LIMITS.SEARCH_MAX) {
    throw new InvalidQueryError(`q must be ${LIMITS.SEARCH_MIN}-${LIMITS.SEARCH_MAX} characters`);
  }

  const folded = foldText(raw);
  const compact = folded.replace(NON_TOKEN_CHARS, '');
  const digits = raw.replace(/\D/g, '');

  return {
    raw,
    nameTokens: tokenize(folded),
    ...(compact.length >= MIN_TOKEN_LENGTH ? { emailFragment: compact } : {}),
    ...(digits.length >= MIN_PHONE_DIGITS ? { phoneDigits: digits } : {})
  };
}

export function isMatchable(term: SearchTerm): boolean {
  return (
    term.nameTokens.length > 0 || term.emailFragment !== undefined || term.phoneDigits !== undefined
  );
}

export function nameTokensOf(text: string): string[] {
  return tokenize(foldText(text));
}

export function compactOf(text: string): string {
  return foldText(text).replace(NON_TOKEN_CHARS, '');
}

function tokenize(folded: string): string[] {
  return folded.split(NON_TOKEN_CHARS).filter((token) => token.length >= MIN_TOKEN_LENGTH);
}
