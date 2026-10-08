import { After, Before } from '@cucumber/cucumber';

import { CustomWorld } from './world';

Before({ tags: '@web or not @api' }, async function (this: CustomWorld) {
  await this.initBrowser();
});

Before({ tags: '@api or not @web' }, async function (this: CustomWorld) {
  await this.initApi();
});

After(async function (this: CustomWorld) {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
  await this.api?.dispose();
});
