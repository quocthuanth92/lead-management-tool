export class HealthService {
  getHealth(): { status: 'ok' | 'degraded' | 'down'; kafka: 'up' | 'down'; db: 'up' | 'down' } {
    return {
      status: 'ok',
      kafka: 'up',
      db: 'up'
    };
  }
}
