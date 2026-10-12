import { LIMITS } from '@lead/shared-contracts';

import { buildSearchFields, foldText, normalizeEmail, normalizePhone } from './index';

describe('normalizePhone', () => {
  it.each([
    ['555 123 4567', '5551234567'],
    ['555-123-4567', '5551234567'],
    ['(555) 123-4567', '5551234567'],
    ['+84 912 345 678', '+84912345678'],
    ['+1 (555) 123-4567', '+15551234567'],
    ['0084912345678', '+84912345678'],
    ['  +44.20.7946.0958  ', '+442079460958']
  ])('normalizes %p to %p', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it('rejects numbers with fewer than the minimum digits', () => {
    expect(normalizePhone('123456')).toBeNull();
    expect(normalizePhone('+12 34')).toBeNull();
  });

  it('rejects numbers with more than the maximum digits', () => {
    expect(normalizePhone('1'.repeat(LIMITS.PHONE_MAX_DIGITS + 1))).toBeNull();
    expect(normalizePhone(`+${'1'.repeat(LIMITS.PHONE_MAX_DIGITS + 1)}`)).toBeNull();
  });

  it('accepts the boundary lengths', () => {
    expect(normalizePhone('1'.repeat(LIMITS.PHONE_MIN_DIGITS))).toBe(
      '1'.repeat(LIMITS.PHONE_MIN_DIGITS)
    );
    expect(normalizePhone('1'.repeat(LIMITS.PHONE_MAX_DIGITS))).toBe(
      '1'.repeat(LIMITS.PHONE_MAX_DIGITS)
    );
  });

  it('rejects letters and empty input', () => {
    expect(normalizePhone('call me maybe')).toBeNull();
    expect(normalizePhone('555-CALL-NOW')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('is idempotent', () => {
    const once = normalizePhone('00 84 (912) 345-678');
    expect(once).not.toBeNull();
    expect(normalizePhone(once as string)).toBe(once);
  });
});

describe('foldText', () => {
  it('lower-cases, folds diacritics and collapses whitespace', () => {
    expect(foldText('  Nguyễn   Văn\tAN ')).toBe('nguyen van an');
    expect(foldText('JOSÉ Müller')).toBe('jose muller');
  });

  it('folds đ and Đ to d', () => {
    expect(foldText('Đặng Đình')).toBe('dang dinh');
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  John.Doe@Example.COM ')).toBe('john.doe@example.com');
  });
});

describe('buildSearchFields', () => {
  it('derives folded name, lower-cased email and phone digits', () => {
    expect(
      buildSearchFields({
        fullName: 'Trần  Thị Đào',
        email: 'Tran@Example.com',
        phone: '+84912345678'
      })
    ).toEqual({
      fullNameSearch: 'tran thi dao',
      emailLower: 'tran@example.com',
      phoneDigits: '84912345678'
    });
  });

  it('omits emailLower when no email is given', () => {
    const fields = buildSearchFields({ fullName: 'Ann', phone: '5551234567' });
    expect(fields.emailLower).toBeUndefined();
    expect(fields.phoneDigits).toBe('5551234567');
  });
});
