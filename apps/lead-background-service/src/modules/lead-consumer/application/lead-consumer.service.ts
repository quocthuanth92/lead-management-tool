import { Injectable, Logger } from '@nestjs/common';

import { LeadEvent } from '../domain/ports/lead-event.port';

@Injectable()
export class LeadConsumerService {
  private readonly logger = new Logger(LeadConsumerService.name);

  async handleEvent(event: LeadEvent): Promise<void> {
    this.logger.log(`Received placeholder event ${event.eventId}`);
  }
}
