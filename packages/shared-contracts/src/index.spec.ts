import { API_PREFIX } from './api/constants';

describe('@lead/shared-contracts', () => {
  it('exports api prefix', () => {
    expect(API_PREFIX).toBe('api/v1');
  });
});
