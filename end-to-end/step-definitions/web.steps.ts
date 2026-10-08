import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import { config } from '../support/config';
import { CustomWorld } from '../support/world';

Given('the web application is running', async function (this: CustomWorld) {
  assert.ok(config.webBaseUrl);
});

When('I open the login page', async function (this: CustomWorld) {
  if (!this.page) {
    await this.initBrowser();
  }
  await this.page!.goto(`${config.webBaseUrl}/login`);
});

Then('I should see the {string} heading', async function (this: CustomWorld, heading: string) {
  const title = this.page?.getByRole('heading', { name: heading });
  await title?.waitFor();
  assert.ok(title);
});
