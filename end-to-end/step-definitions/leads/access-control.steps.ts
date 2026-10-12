import { When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { apiRequest, expiredToken, listLeads } from '../../support/api-client';
import { getLeadApiKey } from '../../support/config';
import type { CustomWorld } from '../../support/world';
import { requireLead } from './helpers';

function requireApi(world: CustomWorld) {
  assert.ok(world.api, 'API context is not initialised');
  return world.api;
}

When('I request the inbox without a token', async function (this: CustomWorld) {
  const result = await listLeads(requireApi(this), '');
  this.record(result.status, result.body);
});

When('I open the lead details without a token', async function (this: CustomWorld) {
  const result = await apiRequest(requireApi(this), 'GET', `/leads/${requireLead(this).id}`);
  this.record(result.status, result.body);
});

When(
  'I request the inbox with the token {string}',
  async function (this: CustomWorld, token: string) {
    const result = await listLeads(requireApi(this), token);
    this.record(result.status, result.body);
  }
);

When('I request the inbox with an expired token', async function (this: CustomWorld) {
  const result = await listLeads(requireApi(this), expiredToken());
  this.record(result.status, result.body);
});

When(
  'I request the inbox with the ingestion key as the credential',
  async function (this: CustomWorld) {
    const result = await apiRequest(requireApi(this), 'GET', '/leads', {
      headers: { 'x-api-key': getLeadApiKey() }
    });
    this.record(result.status, result.body);
  }
);
