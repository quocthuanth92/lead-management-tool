import type { ProcessLeadEventService } from '../../application/process-lead-event.service';
import { LeadConsumerHandler } from './lead-consumer.handler';

describe('LeadConsumerHandler', () => {
  const message = {
    topic: 'leads.incoming',
    partition: 2,
    offset: '117',
    key: '3f2c9a1e-8b7d-4c6e-9f0a-1234567890ab',
    value: '{"schemaVersion":1}'
  };

  let processLeadEvent: { execute: jest.Mock };
  let handler: LeadConsumerHandler;

  beforeEach(() => {
    processLeadEvent = { execute: jest.fn().mockResolvedValue(undefined) };
    handler = new LeadConsumerHandler(processLeadEvent as unknown as ProcessLeadEventService);
  });

  it('delegates the raw message to ProcessLeadEvent unchanged', async () => {
    await handler.handle(message);

    expect(processLeadEvent.execute).toHaveBeenCalledTimes(1);
    expect(processLeadEvent.execute).toHaveBeenCalledWith({
      topic: 'leads.incoming',
      partition: 2,
      offset: '117',
      key: '3f2c9a1e-8b7d-4c6e-9f0a-1234567890ab',
      value: '{"schemaVersion":1}'
    });
  });

  it('propagates processing errors so the offset is not committed', async () => {
    processLeadEvent.execute.mockRejectedValue(new Error('broker unavailable'));

    await expect(handler.handle(message)).rejects.toThrow('broker unavailable');
  });
});
