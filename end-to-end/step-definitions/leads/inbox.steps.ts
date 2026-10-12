import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';

import {
  getAccessToken,
  getLeadDetails,
  listLeads,
  type LeadListItem,
  type PagedLeads
} from '../../support/api-client';
import { getSalespersonCredentials, type AccountLabel } from '../../support/config';
import { ensureInboxHasLeads } from '../../support/seed-data';
import type { CustomWorld } from '../../support/world';

function accountFor(label: string) {
  assert.ok(label === 'A' || label === 'B', `Unknown salesperson "${label}"`);
  return getSalespersonCredentials(label as AccountLabel);
}

function itemsOf(world: CustomWorld): LeadListItem[] {
  return (world.lastBody as PagedLeads).items;
}

async function requestInbox(
  world: CustomWorld,
  label: string,
  params: Record<string, string | number>
): Promise<void> {
  assert.ok(world.api, 'API context is not initialised');
  const account = accountFor(label);
  const token = await getAccessToken(account);
  world.session = { account, token };
  const result = await listLeads(world.api, token, params);
  world.record(result.status, result.body);
}

Given(
  'salesperson {string} has at least {int} lead(s) in the inbox',
  async function (this: CustomWorld, label: string, minimum: number) {
    assert.ok(this.api, 'API context is not initialised');
    await ensureInboxHasLeads(this.api, accountFor(label), minimum);
  }
);

When(
  'I request the inbox of salesperson {string}',
  async function (this: CustomWorld, label: string) {
    await requestInbox(this, label, {});
  }
);

When(
  'I request page {int} of the inbox of salesperson {string} with a limit of {int}',
  async function (this: CustomWorld, page: number, label: string, limit: number) {
    await requestInbox(this, label, { page, limit });
    this.data[`page${page}`] = this.lastBody;
  }
);

When(
  'I request the inbox of salesperson {string} for the dates {string} to {string}',
  async function (this: CustomWorld, label: string, fromDate: string, toDate: string) {
    await requestInbox(this, label, { fromDate, toDate });
  }
);

Then('unread leads are listed before read leads', function (this: CustomWorld) {
  const items = itemsOf(this);
  const firstRead = items.findIndex((item) => item.hasView);
  if (firstRead >= 0) {
    assert.ok(
      items.slice(firstRead).every((item) => item.hasView),
      'An unread lead is listed after a read one'
    );
  }
});

Then('each group is ordered by newest update first', function (this: CustomWorld) {
  const items = itemsOf(this);
  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    if (!previous || !current) {
      continue;
    }
    if (previous.hasView === current.hasView) {
      assert.ok(
        new Date(previous.lastUpdate).getTime() >= new Date(current.lastUpdate).getTime(),
        'Leads in the same group are not newest first'
      );
    }
  }
});

Then('every listed lead was updated within the last six months', function (this: CustomWorld) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  for (const item of itemsOf(this)) {
    assert.ok(new Date(item.lastUpdate) >= cutoff, `Lead ${item.id} is older than six months`);
  }
});

Then(
  'both pages report the same total of at least {int}',
  function (this: CustomWorld, minimum: number) {
    const first = this.data.page1 as PagedLeads;
    const second = this.data.page2 as PagedLeads;
    assert.equal(first.total, second.total, 'The pages report different totals');
    assert.ok(
      first.total >= minimum,
      `Expected a total of at least ${minimum}, got ${first.total}`
    );
    assert.equal(first.items.length, 1);
    assert.equal(second.items.length, 1);
  }
);

Then('the two pages show different leads', function (this: CustomWorld) {
  const [first] = (this.data.page1 as PagedLeads).items;
  const [second] = (this.data.page2 as PagedLeads).items;
  assert.ok(first && second, 'Both pages must contain a lead');
  assert.notEqual(first.id, second.id, 'Pages repeat the same lead');
});

Then('the inbox is empty', function (this: CustomWorld) {
  const body = this.lastBody as PagedLeads;
  assert.equal(body.items.length, 0);
  assert.equal(body.total, 0);
});

Then(
  'salesperson {string} cannot open the leads of salesperson {string}',
  async function (this: CustomWorld, openerLabel: string, ownerLabel: string) {
    assert.ok(this.api, 'API context is not initialised');
    const opener = accountFor(openerLabel);
    const owner = accountFor(ownerLabel);
    const openerToken = await getAccessToken(opener);
    const ownerToken = await getAccessToken(owner);
    const ownerLeads = await listLeads(this.api, ownerToken, { limit: 5 });
    assert.ok(
      ownerLeads.body.items.length > 0,
      `Salesperson ${ownerLabel} has no leads to test with`
    );
    for (const lead of ownerLeads.body.items) {
      const result = await getLeadDetails(this.api, openerToken, lead.id);
      assert.equal(result.status, 404, `Salesperson ${openerLabel} could open lead ${lead.id}`);
    }
  }
);
