import { HealthService } from './health.service';

describe('background health service', () => {
  it('returns status payload', () => {
    const service = new HealthService();
    expect(service.getHealth()).toEqual({
      status: 'ok'
    });
  });
});
