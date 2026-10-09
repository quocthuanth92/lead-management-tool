import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { getServiceHealth } from '../support/api-client.js';
import { config } from '../support/config.js';

let response;

Given('the lead service is running', async function () {
  assert.ok(config.apiBaseUrl);
});

When('I request the lead service health endpoint', async function () {
  response = await getServiceHealth(this);
});

Then('the lead service health response should include {string}', async function (field) {
  assert.ok(response);
  assert.equal(response.status(), 200);
  const json = await response.json();
  assert.ok(field in json);
});
