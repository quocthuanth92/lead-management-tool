import type { APIRequestContext } from '@playwright/test';

import {
  getAccessToken,
  ingestLeadViaApi,
  listLeads,
  searchLeads,
  type LeadListItem,
  type LeadPayload
} from './api-client';
import { getSalespersonCredentials, type SalespersonCredentials } from './config';
import { randomDigits } from './kafka-publisher';
import { waitUntil } from './wait';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export interface ScenarioLead {
  token: string;
  payload: LeadPayload;
  eventId?: string;
  id?: string;
  owner?: SalespersonCredentials;
  lastUpdate?: string;
  hasView?: boolean;
}

export interface LocatedLead {
  owner: SalespersonCredentials;
  item: LeadListItem;
}

// Letters only, so the token survives name folding and infix search.
export function uniqueToken(): string {
  let token = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(10))) {
    token += LETTERS[byte % LETTERS.length];
  }
  return token;
}

export function buildLeadPayload(token: string = uniqueToken()): LeadPayload & { token: string } {
  return {
    token,
    fullName: `Lead e2e ${token}`,
    phone: `+8490${randomDigits(7)}`,
    email: `${token}@e2e.example.test`,
    message: `E2E enquiry ${token}`
  };
}

export function phoneDigitsSuffix(phone: string, length = 7): string {
  return phone.replace(/\D/g, '').slice(-length);
}

export async function locateLeadOwner(
  api: APIRequestContext,
  token: string,
  timeoutMs = 30_000
): Promise<LocatedLead> {
  return waitUntil(
    async () => {
      for (const label of ['A', 'B'] as const) {
        const account = getSalespersonCredentials(label);
        const accessToken = await getAccessToken(account);
        const result = await searchLeads(api, accessToken, { q: token });
        const item = result.body.items?.find((candidate) => candidate.customerName.includes(token));
        if (item) {
          return { owner: account, item };
        }
      }
      return undefined;
    },
    `a lead matching "${token}" to appear in a salesperson inbox`,
    { timeoutMs }
  );
}

export async function createLeadForScenario(api: APIRequestContext): Promise<ScenarioLead> {
  const payload = buildLeadPayload();
  const { token, ...lead } = payload;
  const result = await ingestLeadViaApi(api, lead);
  if (result.status !== 201 || !('id' in result.body)) {
    throw new Error(`Internal ingestion failed with status ${result.status}`);
  }
  const located = await locateLeadOwner(api, token);
  return {
    token,
    payload: lead,
    id: result.body.id,
    owner: located.owner,
    lastUpdate: located.item.lastUpdate,
    hasView: located.item.hasView
  };
}

// Round-robin assignment decides the owner, so tests top up the inbox until it has enough leads.
export async function ensureInboxHasLeads(
  api: APIRequestContext,
  account: SalespersonCredentials,
  minimum: number
): Promise<void> {
  const maxIngestions = minimum * 4;
  for (let attempt = 0; attempt < maxIngestions; attempt += 1) {
    const token = await getAccessToken(account);
    const inbox = await listLeads(api, token, { limit: 1 });
    if (inbox.body.total >= minimum) {
      return;
    }
    await createLeadForScenario(api);
  }
  throw new Error(`Could not give salesperson ${account.label} at least ${minimum} leads`);
}
