export type HealthStatus = 'up' | 'down';
export type OverallHealthStatus = 'ok' | 'degraded' | 'down';

export interface HealthResponse {
  status: OverallHealthStatus;
  db: HealthStatus;
  redis: HealthStatus;
}
