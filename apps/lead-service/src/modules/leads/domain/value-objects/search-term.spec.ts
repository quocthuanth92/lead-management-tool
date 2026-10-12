import { InvalidQueryError } from '../errors/invalid-query.error';
import { isMatchable, parseSearchTerm } from './search-term';

describe('parseSearchTerm', () => {
  it('trims the input and enforces 2 to 100 characters', () => {
    expect(parseSearchTerm('  jo  ').raw).toBe('jo');
    expect(() => parseSearchTerm(' a ')).toThrow(InvalidQueryError);
    expect(() => parseSearchTerm('x'.repeat(101))).toThrow(InvalidQueryError);
    expect(() => parseSearchTerm('x'.repeat(100))).not.toThrow();
  });

  it('keeps regex metacharacters inert so they never match everything', () => {
    expect(isMatchable(parseSearchTerm('.*'))).toBe(false);
    expect(isMatchable(parseSearchTerm('(('))).toBe(false);
    expect(isMatchable(parseSearchTerm('\\\\'))).toBe(false);
  });

  it('treats operator-like text as plain text', () => {
    expect(parseSearchTerm('$where').nameTokens).toEqual(['where']);
  });

  it('extracts phone digits only when at least three digits are present', () => {
    expect(parseSearchTerm('+1 (555) 123-4567').phoneDigits).toBe('15551234567');
    expect(parseSearchTerm('ab 12').phoneDigits).toBeUndefined();
  });

  it('folds case and diacritics the same way the writer folds names', () => {
    expect(parseSearchTerm('Nguyễn').nameTokens).toEqual(['nguyen']);
    expect(parseSearchTerm('Đào').nameTokens).toEqual(['dao']);
  });

  it('drops name tokens shorter than two characters', () => {
    expect(parseSearchTerm('j smith').nameTokens).toEqual(['smith']);
  });

  it('builds an email fragment from letters and digits only', () => {
    expect(parseSearchTerm('john.doe').emailFragment).toBe('johndoe');
  });
});
