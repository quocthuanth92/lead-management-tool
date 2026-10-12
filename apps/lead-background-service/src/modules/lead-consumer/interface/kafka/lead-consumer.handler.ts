import { Injectable } from '@nestjs/common';

import {
  LeadEventMessage,
  ProcessLeadEventService
} from '../../application/process-lead-event.service';

@Injectable()
export class LeadConsumerHandler {
  constructor(private readonly processLeadEvent: ProcessLeadEventService) {}

  async handle(message: LeadEventMessage): Promise<void> {
    await this.processLeadEvent.execute({
      topic: message.topic,
      partition: message.partition,
      offset: message.offset,
      key: message.key,
      value: message.value
    });
  }
}
