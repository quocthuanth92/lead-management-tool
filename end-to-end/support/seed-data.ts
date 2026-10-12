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
const FIRST_NAMES = [
  'Ava',
  'Liam',
  'Noah',
  'Emma',
  'Olivia',
  'Lucas',
  'Sophia',
  'Mason',
  'Isabella',
  'Ethan',
  'Mia',
  'James',
  'Charlotte',
  'Benjamin',
  'Amelia'
];
const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Brown',
  'Taylor',
  'Wilson',
  'Clark',
  'Anderson',
  'Thomas',
  'Moore',
  'Martin',
  'Lee',
  'Walker',
  'Harris',
  'Young',
  'Allen'
];

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
  for (const byte of crypto.getRandomValues(new Uint8Array(5))) {
    token += LETTERS[byte % LETTERS.length];
  }
  return token;
}

// Generates a realistic, English-sounding name for a lead while keeping the token visible for search.
export function buildLeadName(token: string): string {
  const randomValues = crypto.getRandomValues(new Uint32Array(2));
  const firstIndex = (randomValues[0] ?? 0) % FIRST_NAMES.length;
  const lastIndex = (randomValues[1] ?? 0) % LAST_NAMES.length;
  const firstName = FIRST_NAMES[firstIndex];
  const lastName = LAST_NAMES[lastIndex];
  return `${firstName} ${lastName} ${token}`;
}

export function buildLeadPayload(token: string = uniqueToken()): LeadPayload & { token: string } {
  return {
    token,
    fullName: buildLeadName(token),
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
        const item = result.body.items?.find(
          (candidate) => candidate.customerName?.includes(token) === true
        );
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
