import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import {
  addLeadActivity,
  apiRequest,
  getAccessToken,
  listLeadActivities,
  listLeads,
  type LeadActivity
} from '../../support/api-client';
import type { CustomWorld } from '../../support/world';
import { findInOwnerInbox, requireLead, requireOwner, requireSession } from './helpers';

When(
  'I add the activity note {string} to the lead',
  async function (this: CustomWorld, content: string) {
    assert.ok(this.api, 'API context is not initialised');
    const lead = requireLead(this);
    const { token } = requireSession(this);
    const result = await addLeadActivity(this.api, token, lead.id, content);
    this.record(result.status, result.body);
  }
);

async function firstActivityId(world: CustomWorld): Promise<string> {
  assert.ok(world.api, 'API context is not initialised');
  const lead = requireLead(world);
  const { token } = requireSession(world);
  const activities = await listLeadActivities(world.api, token, lead.id);
  const [first] = activities.body.items;
  assert.ok(first, 'The lead has no activity to modify');
  return first.id;
}

When('I try to edit the first activity of the lead', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const { token } = requireSession(this);
  const activityId = await firstActivityId(this);
  const result = await apiRequest(this.api, 'PUT', `/leads/${lead.id}/activities/${activityId}`, {
    token,
    data: { content: 'Edited note' }
  });
  this.record(result.status, result.body);
});

When('I try to delete the first activity of the lead', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireLead(this);
  const { token } = requireSession(this);
  const activityId = await firstActivityId(this);
  const result = await apiRequest(
    this.api,
    'DELETE',
    `/leads/${lead.id}/activities/${activityId}`,
    { token }
  );
  this.record(result.status, result.body);
});

Then('the request is refused as not found or not allowed', function (this: CustomWorld) {
  assert.ok(
    this.lastStatus === 404 || this.lastStatus === 405,
    `Unexpected status ${this.lastStatus}`
  );
});

Then(
  'the lead activities are listed newest first with {string} before {string}',
  async function (this: CustomWorld, newer: string, older: string) {
    assert.ok(this.api, 'API context is not initialised');
    const lead = requireLead(this);
    const { token } = requireSession(this);
    const activities = await listLeadActivities(this.api, token, lead.id);
    const contents = activities.body.items.map((activity: LeadActivity) => activity.content);
    const newerIndex = contents.indexOf(newer);
    const olderIndex = contents.indexOf(older);
    assert.ok(newerIndex >= 0 && olderIndex >= 0, `Missing notes in ${JSON.stringify(contents)}`);
    assert.ok(newerIndex < olderIndex, `"${newer}" should be listed before "${older}"`);
  }
);

Then(
  'the lead is the first read lead in the inbox of its salesperson',
  async function (this: CustomWorld) {
    assert.ok(this.api, 'API context is not initialised');
    const lead = requireLead(this);
    const token = await getAccessToken(requireOwner(this));
    const inbox = await listLeads(this.api, token, { limit: 50 });
    const firstRead = inbox.body.items.find((item) => item.hasView);
    assert.equal(firstRead?.id, lead.id, 'The lead is not the first read lead');
  }
);

Then('the lead last update is later than before the note', async function (this: CustomWorld) {
  const lead = requireLead(this);
  const item = await findInOwnerInbox(this, lead.token);
  assert.ok(item, 'The lead is missing from the inbox');
  assert.ok(
    new Date(item.lastUpdate).getTime() > new Date(lead.lastUpdate ?? 0).getTime(),
    'Adding a note did not advance lastUpdate'
  );
});
