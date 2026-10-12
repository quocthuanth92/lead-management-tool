import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import {
  apiRequest,
  getAccessToken,
  ingestLeadViaApi,
  searchLeads,
  type LeadPayload
} from '../../support/api-client';
import { createLeadForScenario, buildLeadPayload } from '../../support/seed-data';
import { getLeadApiKey, otherSalesperson } from '../../support/config';
import type { CustomWorld } from '../../support/world';
import { requireLead, requireOwner } from './helpers';

When(
  'I submit a lead through the internal API with the ingestion key',
  async function (this: CustomWorld) {
    assert.ok(this.api, 'API context is not initialised');
    this.lead = await createLeadForScenario(this.api);
    this.record(201, { id: this.lead.id });
  }
);

When(
  'I submit a lead through the internal API without the ingestion key',
  async function (this: CustomWorld) {
    assert.ok(this.api, 'API context is not initialised');
    const { fullName, phone, email, message } = buildLeadPayload();
    const result = await ingestLeadViaApi(this.api, { fullName, phone, email, message }, null);
    this.record(result.status, result.body);
  }
);

When(
  'I submit an invalid lead through the internal API with the ingestion key',
  async function (this: CustomWorld) {
    assert.ok(this.api, 'API context is not initialised');
    const invalid = { phone: '12', message: '' } as unknown as LeadPayload;
    const result = await ingestLeadViaApi(this.api, invalid, getLeadApiKey());
    this.record(result.status, result.body);
  }
);

Then('the response contains an id', function (this: CustomWorld) {
  const body = this.lastBody as { id?: unknown };
  assert.equal(typeof body?.id, 'string', 'Response has no id');
});

Then('the response error shape is returned', function (this: CustomWorld) {
  const body = this.lastBody as Record<string, unknown>;
  assert.ok(typeof body?.statusCode === 'number', 'Missing statusCode');
  assert.ok(typeof body?.message === 'string' || Array.isArray(body?.message), 'Missing message');
  assert.equal(typeof body?.error, 'string', 'Missing error');
});

Then(
  'the lead is listed unread in the inbox of its assigned salesperson',
  async function (this: CustomWorld) {
    assert.ok(this.api, 'API context is not initialised');
    const lead = requireLead(this);
    const owner = requireOwner(this);
    const token = await getAccessToken(owner);
    const result = await searchLeads(this.api, token, { q: lead.token });
    const item = result.body.items.find((candidate) => candidate.id === lead.id);
    assert.ok(item, 'The lead is missing from its assigned inbox');
    assert.equal(item.hasView, false, 'A new lead must be unread');
  }
);

Then('the lead is not visible to the other salesperson', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const other = otherSalesperson(requireOwner(this));
  const token = await getAccessToken(other);
  const search = await searchLeads(this.api, token, { q: lead.token });
  assert.equal(search.body.items.length, 0, 'The other salesperson can see the lead in search');
  const details = await apiRequest(this.api, 'GET', `/leads/${lead.id}`, { token });
  assert.equal(details.status, 404, 'The other salesperson can open the lead');
});
