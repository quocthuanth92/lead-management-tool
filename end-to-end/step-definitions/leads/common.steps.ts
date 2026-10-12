import { Given, Then } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { getAccessToken } from '../../support/api-client';
import { createLeadForScenario } from '../../support/seed-data';
import { getSalespersonCredentials, otherSalesperson } from '../../support/config';
import { CustomWorld } from '../../support/world';

Given('a new lead is ingested through the internal API', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  this.lead = await createLeadForScenario(this.api);
});

Given('I am signed in as the lead owner', async function (this: CustomWorld) {
  assert.ok(this.lead?.owner, 'Create a lead before signing in as its owner');
  this.session = { account: this.lead.owner, token: await getAccessToken(this.lead.owner) };
});

Given('I am signed in as the other salesperson', async function (this: CustomWorld) {
  assert.ok(this.lead?.owner, 'Create a lead before signing in as the other salesperson');
  const account = otherSalesperson(this.lead.owner);
  this.session = { account, token: await getAccessToken(account) };
});

Given('I am signed in as salesperson {string}', async function (this: CustomWorld, label: string) {
  assert.ok(label === 'A' || label === 'B', `Unknown salesperson "${label}"`);
  const account = getSalespersonCredentials(label);
  this.session = { account, token: await getAccessToken(account) };
});

Then('the response status should be {int}', function (this: CustomWorld, status: number) {
  assert.equal(
    this.lastStatus,
    status,
    `Unexpected response body: ${JSON.stringify(this.lastBody)}`
  );
});
