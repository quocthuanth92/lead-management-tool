import { Injectable, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';

import { LeadConsumerService } from '../../application/lead-consumer.service';
import { LeadEvent } from '../../domain/ports/lead-event.port';

@Injectable()
export class LeadConsumerHandler {
  private readonly logger = new Logger(LeadConsumerHandler.name);

  constructor(private readonly leadConsumerService: LeadConsumerService) {}

  @EventPattern(process.env.KAFKA_LEADS_TOPIC ?? 'leads.incoming')
  async handleLeadEvent(@Payload() payload: unknown, @Ctx() context: unknown): Promise<void> {
    const kafkaContext = context as KafkaContext;
    const event: LeadEvent = {
      eventId: `${kafkaContext.getTopic()}-${Date.now()}`,
      payload
    };
    await this.leadConsumerService.handleEvent(event);
    this.logger.log(`Processed event on topic ${kafkaContext.getTopic()}`);
  }
}
