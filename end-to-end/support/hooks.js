import { After, Before } from '@cucumber/cucumber';

Before({ tags: '@web or not @api' }, async function () {
  await this.initBrowser();
});

Before({ tags: '@api or not @web' }, async function () {
  await this.initApi();
});

After(async function () {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
  await this.api?.dispose();
});
