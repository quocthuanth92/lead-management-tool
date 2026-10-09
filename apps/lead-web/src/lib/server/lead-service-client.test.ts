import { getLeadServiceUrl } from './session';

describe('lead service client boundary', () => {
  it('uses server-side lead service url from env', () => {
    process.env.LEAD_SERVICE_URL = 'http://localhost:3001';
    expect(getLeadServiceUrl()).toBe('http://localhost:3001');
  });
});
