import 'server-only';

import { cookies } from 'next/headers';

const DEFAULT_COOKIE_NAME = 'lead_session';

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookieName = process.env.SESSION_COOKIE_NAME ?? DEFAULT_COOKIE_NAME;
  return cookieStore.get(cookieName)?.value;
}

export function getLeadServiceUrl(): string {
  return process.env.LEAD_SERVICE_URL ?? 'http://localhost:3001';
}
