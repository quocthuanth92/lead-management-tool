import assert from 'node:assert/strict';

import { getAccessToken, searchLeads, type LeadListItem } from '../../support/api-client';
import type { SalespersonCredentials } from '../../support/config';
import type { CustomWorld } from '../../support/world';
import type { ScenarioLead } from '../../support/seed-data';

export function requireScenarioLead(world: CustomWorld): ScenarioLead {
  assert.ok(world.lead, 'A lead must be created earlier in this scenario');
  return world.lead;
}

export function requireLead(world: CustomWorld): ScenarioLead & { id: string } {
  const lead = requireScenarioLead(world);
  assert.ok(lead.id, 'The scenario lead has no id yet');
  return lead as ScenarioLead & { id: string };
}

export function requireOwner(world: CustomWorld): SalespersonCredentials {
  const lead = requireLead(world);
  assert.ok(lead.owner, 'The scenario lead has no assigned salesperson yet');
  return lead.owner;
}

export function requireSession(world: CustomWorld): {
  account: SalespersonCredentials;
  token: string;
} {
  assert.ok(world.session, 'Sign in as a salesperson earlier in this scenario');
  return world.session;
}

// Looks the lead up in its owner's inbox by the unique token it was created with.
export async function findInOwnerInbox(
  world: CustomWorld,
  query: string
): Promise<LeadListItem | undefined> {
  assert.ok(world.api, 'API context is not initialised');
  const owner = requireOwner(world);
  const token = await getAccessToken(owner);
  const result = await searchLeads(world.api, token, { q: query });
  return result.body.items.find((item) => item.id === requireLead(world).id);
}
