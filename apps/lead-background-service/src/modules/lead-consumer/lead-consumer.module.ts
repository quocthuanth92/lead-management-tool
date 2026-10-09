import { Module } from '@nestjs/common';

import { LeadConsumerService } from './application/lead-consumer.service';
import { LeadConsumerHandler } from './interface/kafka/lead-consumer.handler';

@Module({
  providers: [LeadConsumerService, LeadConsumerHandler]
})
export class LeadConsumerModule {}
