import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { APIResponse } from '@playwright/test';

import { getServiceHealth } from '../support/api-client';
import { config } from '../support/config';
import { CustomWorld } from '../support/world';

let response: APIResponse | undefined;

Given('the lead service is running', async function () {
  assert.ok(config.apiBaseUrl);
});

When('I request the lead service health endpoint', async function (this: CustomWorld) {
  response = await getServiceHealth(this);
});

Then('the lead service health response should include {string}', async function (field: string) {
  assert.ok(response);
  assert.equal(response.status(), 200);
  const json = (await response.json()) as Record<string, unknown>;
  assert.ok(field in json);
});
