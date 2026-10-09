import { LIMITS } from '@lead/shared-contracts';

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) {
    return null;
  }

  let digits = trimmed.replace(/\D/g, '');
  let international = trimmed.startsWith('+');
  if (!international && digits.startsWith('00')) {
    digits = digits.slice(2);
    international = true;
  }

  if (digits.length < LIMITS.PHONE_MIN_DIGITS || digits.length > LIMITS.PHONE_MAX_DIGITS) {
    return null;
  }
  return international ? `+${digits}` : digits;
}
