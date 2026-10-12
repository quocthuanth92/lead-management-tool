import { buildLeadEvent, publishLeadEvent } from '../support/kafka-publisher';
import { buildLeadPayload } from '../support/seed-data';

const { token, ...lead } = buildLeadPayload();
const event = buildLeadEvent(lead);

publishLeadEvent(event)
  .then(() => {
    console.log(JSON.stringify({ published: true, eventId: event.eventId, marker: token }));
  })
  .catch((error: unknown) => {
    console.error('Failed to publish lead event:', error);
    process.exitCode = 1;
  });
