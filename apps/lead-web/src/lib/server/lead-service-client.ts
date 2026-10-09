import 'server-only';

import { HealthResponse } from '@lead/shared-contracts';

import { getAccessToken, getLeadServiceUrl } from './session';

export async function fetchLeadServiceHealth(): Promise<HealthResponse | { status: 'down' }> {
  const token = await getAccessToken();
  const response = await fetch(`${getLeadServiceUrl()}/api/v1/health`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store'
  });
  if (!response.ok) {
    return { status: 'down' };
  }
  return (await response.json()) as HealthResponse;
}
