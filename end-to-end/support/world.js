import { setWorldConstructor, World } from '@cucumber/cucumber';
import { chromium, request } from '@playwright/test';

import { config } from './config.js';

export class CustomWorld extends World {
  browser;
  context;
  page;
  api;

  constructor(options) {
    super(options);
  }

  async initBrowser() {
    this.browser = await chromium.launch({ headless: config.headless });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async initApi() {
    this.api = await request.newContext({ baseURL: config.apiBaseUrl });
  }
}

setWorldConstructor(CustomWorld);
