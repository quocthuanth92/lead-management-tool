import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { getLeadDetails } from '../../support/api-client';
import type { CustomWorld } from '../../support/world';
import { findInOwnerInbox, requireLead, requireSession } from './helpers';

When('I open the lead details', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const { token } = requireSession(this);
  const result = await getLeadDetails(this.api, token, lead.id);
  this.record(result.status, result.body);
});

When('I open the lead with id {string}', async function (this: CustomWorld, leadId: string) {
  assert.ok(this.api, 'API context is not initialised');
  const { token } = requireSession(this);
  const result = await getLeadDetails(this.api, token, leadId);
  this.record(result.status, result.body);
});

Then('the lead details show the lead as read', function (this: CustomWorld) {
  const body = this.lastBody as { hasView?: boolean };
  assert.equal(body.hasView, true, 'Opening the lead did not mark it as read');
});

Then('the lead is no longer unread in the inbox', async function (this: CustomWorld) {
  const item = await findInOwnerInbox(this, requireLead(this).token);
  assert.ok(item, 'The lead is missing from the inbox');
  assert.equal(item.hasView, true, 'The inbox still shows the lead as unread');
});

Then('the lead last update did not change', function (this: CustomWorld) {
  const body = this.lastBody as { lastUpdate?: string };
  assert.equal(
    body.lastUpdate,
    requireLead(this).lastUpdate,
    'Reading the lead changed lastUpdate'
  );
});
