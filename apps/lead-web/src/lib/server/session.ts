import 'server-only';

import { cookies } from 'next/headers';

import { getSessionCookieName, getUserCookieName } from '../auth/session-config';

export interface SessionProfile {
  fullName: string;
  email: string;
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(getSessionCookieName())?.value;
}

export async function getSessionProfile(): Promise<SessionProfile | undefined> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getUserCookieName())?.value;
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<SessionProfile>;
    if (typeof parsed.fullName === 'string' && typeof parsed.email === 'string') {
      return { fullName: parsed.fullName, email: parsed.email };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function getLeadServiceUrl(): string {
  return process.env.LEAD_SERVICE_URL ?? 'http://localhost:3001';
}
