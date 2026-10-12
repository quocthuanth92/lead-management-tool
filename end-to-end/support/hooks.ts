import {
  After,
  Before,
  setDefaultTimeout,
  Status,
  type ITestCaseHookParameter
} from '@cucumber/cucumber';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { CustomWorld } from './world';

const BROWSER_TAGS = ['@web', '@ui'];
const FAILURE_DIR = path.join(process.cwd(), 'reports', 'failures');

setDefaultTimeout(90_000);

function needsBrowser(hook: ITestCaseHookParameter): boolean {
  return hook.pickle.tags.some((tag) => BROWSER_TAGS.includes(tag.name));
}

Before(async function (this: CustomWorld, hook) {
  await this.initApi();
  if (needsBrowser(hook)) {
    await this.initBrowser();
  }
});

After(async function (this: CustomWorld, hook) {
  if (hook.result?.status === Status.FAILED && this.page) {
    await mkdir(FAILURE_DIR, { recursive: true });
    const name = hook.pickle.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    await this.page.screenshot({ path: path.join(FAILURE_DIR, `${name}.png`), fullPage: true });
  }
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
  await this.api?.dispose();
});
