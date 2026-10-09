export class HealthService {
  getHealth(): { status: 'ok' | 'degraded' | 'down' } {
    return {
      status: 'ok'
    };
  }
}
