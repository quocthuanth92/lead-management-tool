import { Then, When } from '@cucumber/cucumber';
import { expect, type Page } from '@playwright/test';
import assert from 'node:assert/strict';

import { config } from '../../support/config';
import { CustomWorld } from '../../support/world';

const SESSION_COOKIE_NAME = 'lead_session';
const UI_TIMEOUT_MS = 15_000;
// Bodies of documents and scripts (and the RSC payloads Next.js streams to the client) must never carry the token.
const TEXT_CONTENT_TYPE = /text\/html|javascript|ecmascript|text\/x-component/i;

interface CapturedResponse {
  url: string;
  contentType: string;
  body: Promise<string>;
}

const textResponseBodies = new WeakMap<Page, CapturedResponse[]>();

function requirePage(world: CustomWorld): Page {
  assert.ok(world.page, 'Browser page is not initialised; tag the scenario with @ui or @web');
  return world.page;
}

function requireLead(world: CustomWorld) {
  assert.ok(world.lead, 'Ingest a lead through the internal API before using the browser');
  return world.lead;
}

function inboxRows(page: Page) {
  return page.locator('ul[aria-label="Leads"] > li');
}

function leadRow(page: Page, fullName: string) {
  return inboxRows(page).filter({ hasText: fullName });
}

function trackTextResponses(page: Page): void {
  const captured: CapturedResponse[] = [];
  page.on('response', (response) => {
    const contentType = response.headers()['content-type'] ?? '';
    if (TEXT_CONTENT_TYPE.test(contentType)) {
      captured.push({
        url: response.url(),
        contentType,
        body: response.text().catch(() => '')
      });
    }
  });
  textResponseBodies.set(page, captured);
}

function assertNotLeaked(haystack: string, token: string, where: string): void {
  assert.ok(!haystack.includes(token), `The session token was found in ${where}`);
}

When('I sign in through the browser as the lead owner', async function (this: CustomWorld) {
  const page = requirePage(this);
  const owner = requireLead(this).owner;
  assert.ok(owner, 'The lead owner is unknown; ingest the lead before signing in');

  trackTextResponses(page);
  await page.goto(`${config.webBaseUrl}/login`);
  await page.getByLabel('Email', { exact: true }).fill(owner.email);
  await page.getByLabel('Password', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/leads**', { timeout: UI_TIMEOUT_MS });
});

Then('the browser inbox shows the lead as unread', async function (this: CustomWorld) {
  const page = requirePage(this);
  const row = leadRow(page, requireLead(this).payload.fullName);

  await expect(row).toHaveCount(1, { timeout: UI_TIMEOUT_MS });
  await expect(row.getByText('Unread', { exact: true })).toHaveCount(1);
});

When('I search the browser inbox for the lead name', async function (this: CustomWorld) {
  const page = requirePage(this);
  const fullName = requireLead(this).payload.fullName;

  await page.getByRole('searchbox', { name: 'Search leads', exact: true }).fill(fullName);
  await expect(page).toHaveURL(/[?&]q=/, { timeout: UI_TIMEOUT_MS });
});

When('I open the lead from the browser inbox', async function (this: CustomWorld) {
  const page = requirePage(this);
  const row = leadRow(page, requireLead(this).payload.fullName);

  await expect(row).toHaveCount(1, { timeout: UI_TIMEOUT_MS });
  await row.getByRole('link').click();
  await page.waitForURL('**/leads/**', { timeout: UI_TIMEOUT_MS });
});

When(
  'I change the lead label in the browser to {string}',
  async function (this: CustomWorld, label: string) {
    const page = requirePage(this);
    const select = page.getByRole('combobox', { name: 'Label', exact: true });

    await expect(select).toBeEnabled({ timeout: UI_TIMEOUT_MS });
    const [response] = await Promise.all([
      page.waitForResponse(
        (candidate) => candidate.request().method() === 'PUT' && candidate.url().includes('/label'),
        { timeout: UI_TIMEOUT_MS }
      ),
      select.selectOption(label)
    ]);
    assert.ok(response.ok(), `Label update failed with status ${response.status()}`);
    await expect(select).toHaveValue(label);
  }
);

When('I add the note {string} in the browser', async function (this: CustomWorld, note: string) {
  const page = requirePage(this);

  await page.getByLabel('Activity note', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('ol li').filter({ hasText: note })).toHaveCount(1, {
    timeout: UI_TIMEOUT_MS
  });
});

When('I return to the browser inbox', async function (this: CustomWorld) {
  const page = requirePage(this);

  await page.getByRole('link', { name: 'Back to inbox', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lead Inbox', exact: true })).toBeVisible({
    timeout: UI_TIMEOUT_MS
  });
});

Then(
  'the browser inbox shows the lead as read with the label {string}',
  async function (this: CustomWorld, labelText: string) {
    const page = requirePage(this);
    const row = leadRow(page, requireLead(this).payload.fullName);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lead Inbox', exact: true })).toBeVisible({
      timeout: UI_TIMEOUT_MS
    });
    await expect(row).toHaveCount(1, { timeout: UI_TIMEOUT_MS });
    await expect(row.getByText('Unread', { exact: true })).toHaveCount(0);
    await expect(row.getByText(labelText, { exact: true })).toHaveCount(1);
  }
);

Then(
  'the session token is absent from the page HTML, scripts, and localStorage',
  async function (this: CustomWorld) {
    const page = requirePage(this);
    assert.ok(this.context, 'Browser context is not initialised');

    const cookies = await this.context.cookies(config.webBaseUrl);
    const token = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME)?.value;
    assert.ok(token, `Expected the ${SESSION_COOKIE_NAME} cookie after browser sign-in`);

    const captured = textResponseBodies.get(page) ?? [];
    assert.ok(captured.length > 0, 'No HTML or JavaScript responses were captured');
    const bodies = await Promise.all(captured.map((response) => response.body));
    const leaks = captured
      .filter((_response, index) => bodies[index]?.includes(token))
      .map((response) => `${response.contentType} ${new URL(response.url).pathname}`);
    assert.deepEqual(leaks, [], 'The session token was found in these loaded responses');

    assertNotLeaked(await page.content(), token, 'the rendered page HTML');

    const storage = await page.evaluate(() => ({
      localStorage: Object.fromEntries(
        Object.keys(window.localStorage).map((key) => [key, window.localStorage.getItem(key) ?? ''])
      ),
      sessionStorage: Object.fromEntries(
        Object.keys(window.sessionStorage).map((key) => [
          key,
          window.sessionStorage.getItem(key) ?? ''
        ])
      ),
      documentCookie: document.cookie
    }));
    assertNotLeaked(JSON.stringify(storage.localStorage), token, 'localStorage');
    assertNotLeaked(JSON.stringify(storage.sessionStorage), token, 'sessionStorage');
    assertNotLeaked(storage.documentCookie, token, 'document.cookie');
  }
);
