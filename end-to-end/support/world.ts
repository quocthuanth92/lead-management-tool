import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import {
  APIRequestContext,
  Browser,
  BrowserContext,
  chromium,
  Page,
  request
} from '@playwright/test';

import type { SalespersonCredentials } from './config';
import { config } from './config';
import type { ScenarioLead } from './seed-data';

export class CustomWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  api?: APIRequestContext;

  lead?: ScenarioLead;
  session?: { account: SalespersonCredentials; token: string };
  lastStatus?: number;
  lastBody?: unknown;
  data: Record<string, unknown> = {};

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

  record(status: number, body: unknown): void {
    this.lastStatus = status;
    this.lastBody = body;
  }
}

setWorldConstructor(CustomWorld);
