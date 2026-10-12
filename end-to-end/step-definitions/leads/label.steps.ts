import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { getLeadDetails, setLeadLabel } from '../../support/api-client';
import type { CustomWorld } from '../../support/world';
import { requireLead, requireSession } from './helpers';

When('I set the label to {string}', async function (this: CustomWorld, label: string) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const { token } = requireSession(this);
  const result = await setLeadLabel(this.api, token, lead.id, label);
  this.record(result.status, result.body);
});

Then('the lead label should be {string}', async function (this: CustomWorld, label: string) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const { token } = requireSession(this);
  const details = await getLeadDetails(this.api, token, lead.id);
  assert.equal(details.body.label, label);
});

Then('the lead has exactly one label', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const { token } = requireSession(this);
  const details = await getLeadDetails(this.api, token, lead.id);
  assert.equal(typeof details.body.label, 'string', 'The label is not a single value');
});
