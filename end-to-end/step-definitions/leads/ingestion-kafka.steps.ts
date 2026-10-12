import { Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { getAccessToken, searchLeads } from '../../support/api-client';
import { getSalespersonCredentials } from '../../support/config';
import {
  buildLeadEvent,
  findDeadLetter,
  publishLeadEvent,
  publishRawMessage
} from '../../support/kafka-publisher';
import { buildLeadPayload, locateLeadOwner } from '../../support/seed-data';
import { waitUntil } from '../../support/wait';
import type { CustomWorld } from '../../support/world';
import { requireScenarioLead } from './helpers';

When('I publish a valid lead event to Kafka', async function (this: CustomWorld) {
  const { token, ...lead } = buildLeadPayload();
  const event = buildLeadEvent(lead);
  await publishLeadEvent(event);
  this.lead = { token, payload: lead, eventId: event.eventId };
});

When('I publish the same lead event again', async function (this: CustomWorld) {
  const lead = requireScenarioLead(this);
  assert.ok(lead.eventId, 'No event was published in this scenario');
  await publishLeadEvent(buildLeadEvent(lead.payload, lead.eventId));
});

When('I publish an invalid lead event to Kafka', async function (this: CustomWorld) {
  const { token, ...lead } = buildLeadPayload();
  const eventId = randomUUID();
  const invalid = {
    schemaVersion: 1,
    eventId,
    occurredAt: new Date().toISOString(),
    lead: { ...lead, phone: '12' }
  };
  await publishRawMessage(JSON.stringify(invalid), eventId);
  this.lead = { token, payload: lead, eventId };
});

Then(
  'the event lead appears unread in the assigned salesperson inbox within 60 seconds',
  async function (this: CustomWorld) {
    assert.ok(this.api, 'API context is not initialised');
    const lead = requireScenarioLead(this);
    const located = await locateLeadOwner(this.api, lead.token, 60_000);
    assert.equal(located.item.hasView, false, 'An ingested event must be unread');
    lead.owner = located.owner;
    lead.id = located.item.id;
  }
);

Then('exactly one lead exists for the event', async function (this: CustomWorld) {
  assert.ok(this.api, 'API context is not initialised');
  const lead = requireScenarioLead(this);
  // Give the duplicate delivery time to be processed before counting.
  await new Promise((resolve) => setTimeout(resolve, 10_000));
  let matches = 0;
  for (const label of ['A', 'B'] as const) {
    const account = getSalespersonCredentials(label);
    const token = await getAccessToken(account);
    const result = await searchLeads(this.api, token, { q: lead.token });
    matches += result.body.items.filter((item) => item.customerName.includes(lead.token)).length;
  }
  assert.equal(matches, 1, `Expected exactly one lead for the event, found ${matches}`);
});

Then(
  'one dead-letter message is recorded for the event within 60 seconds',
  async function (this: CustomWorld) {
    const lead = requireScenarioLead(this);
    const envelope = await waitUntil(
      () => findDeadLetter(lead.token, 5_000),
      'a dead-letter message for the invalid event',
      { timeoutMs: 60_000, intervalMs: 1_000 }
    );
    assert.equal(envelope.reason, 'INVALID_PAYLOAD');
  }
);
