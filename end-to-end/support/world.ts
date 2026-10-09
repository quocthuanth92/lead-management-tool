import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import {
  Browser,
  BrowserContext,
  chromium,
  Page,
  request,
  APIRequestContext
} from '@playwright/test';

import { config } from './config';

export class CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  api?: APIRequestContext;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async initBrowser(): Promise<void> {
    this.browser = await chromium.launch({ headless: config.headless });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async initApi(): Promise<void> {
    this.api = await request.newContext({ baseURL: config.apiBaseUrl });
  }
}

setWorldConstructor(CustomWorld);
