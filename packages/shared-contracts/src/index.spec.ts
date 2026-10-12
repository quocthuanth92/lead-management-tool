import { API_PREFIX } from './api/constants';
import { DEFAULT_RANGE_MONTHS, MAX_LIMIT } from './leads/limits';

describe('@lead/shared-contracts', () => {
  it('exports api prefix', () => {
    expect(API_PREFIX).toBe('api/v1');
  });

  it('exports the main pagination constants', () => {
    expect(MAX_LIMIT).toBe(200);
    expect(DEFAULT_RANGE_MONTHS).toBe(6);
  });
});
