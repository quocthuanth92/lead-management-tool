import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { getAccessToken, searchLeads, type PagedLeads } from '../../support/api-client';
import { phoneDigitsSuffix } from '../../support/seed-data';
import type { CustomWorld } from '../../support/world';
import { requireLead, requireOwner, requireSession } from './helpers';

async function searchOwnerInbox(world: CustomWorld, params: Record<string, string>): Promise<void> {
  assert.ok(world.api, 'API context is not initialised');
  const token = await getAccessToken(requireOwner(world));
  const result = await searchLeads(world.api, token, params);
  world.record(result.status, result.body);
}

When('I search the lead owner inbox for the lead name', async function (this: CustomWorld) {
  await searchOwnerInbox(this, { q: requireLead(this).payload.fullName });
});

When('I search the lead owner inbox for the lead email', async function (this: CustomWorld) {
  const email = requireLead(this).payload.email;
  assert.ok(email, 'The scenario lead has no email');
  await searchOwnerInbox(this, { q: email });
});

When('I search the lead owner inbox for the lead phone', async function (this: CustomWorld) {
  await searchOwnerInbox(this, { q: phoneDigitsSuffix(requireLead(this).payload.phone) });
});

When(
  'I search the lead owner inbox for the lead name with label {string}',
  async function (this: CustomWorld, label: string) {
    await searchOwnerInbox(this, { q: requireLead(this).payload.fullName, label });
  }
);

When(
  'I search the lead owner inbox for the lead name between {string} and {string}',
  async function (this: CustomWorld, fromDate: string, toDate: string) {
    await searchOwnerInbox(this, { q: requireLead(this).payload.fullName, fromDate, toDate });
  }
);

When('I search salesperson inbox for {string}', async function (this: CustomWorld, query: string) {
  assert.ok(this.api, 'API context is not initialised');
  const { token } = requireSession(this);
  const result = await searchLeads(this.api, token, { q: query });
  this.record(result.status, result.body);
});

Then('the search results include the lead', function (this: CustomWorld) {
  const lead = requireLead(this);
  const body = this.lastBody as PagedLeads;
  assert.ok(
    body.items.some((item) => item.id === lead.id),
    'The search results do not include the lead'
  );
});

Then('the search results do not include the lead', function (this: CustomWorld) {
  const lead = requireLead(this);
  const body = this.lastBody as PagedLeads;
  assert.ok(
    !body.items.some((item) => item.id === lead.id),
    'The search results unexpectedly include the lead'
  );
});

Then('the search response contains an items list', function (this: CustomWorld) {
  const body = this.lastBody as { items?: unknown };
  assert.ok(Array.isArray(body.items), 'The search response has no items list');
});
