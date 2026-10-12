import { Inject, Injectable } from '@nestjs/common';
import { LeadWriter, normalizePhone } from '@lead/persistence';

import { LEAD_WRITER } from '../../../core/database/database.module';
import { InvalidLeadError } from '../domain/errors/invalid-lead.error';
import {
  IngestExternalLeadCommand,
  IngestLeadResult,
  LeadIngestionPort
} from '../domain/ports/lead-ingestion.port';

@Injectable()
export class MongoLeadIngestionAdapter implements LeadIngestionPort {
  constructor(@Inject(LEAD_WRITER) private readonly writer: LeadWriter) {}

  async ingest(command: IngestExternalLeadCommand): Promise<IngestLeadResult> {
    if (normalizePhone(command.lead.phone) === null) {
      throw new InvalidLeadError(['phone: must contain 7 to 20 digits']);
    }

    const result = await this.writer.writeLead(
      {
        fullName: command.lead.fullName,
        phone: command.lead.phone,
        ...(command.lead.email !== undefined ? { email: command.lead.email } : {}),
        message: command.lead.message
      },
      { source: command.source, externalEventId: command.externalEventId }
    );

    if (result.duplicate === true) {
      return { status: 'DUPLICATE' };
    }
    return {
      status: 'CREATED',
      leadId: result.id,
      ...(result.userId !== undefined ? { assigneeId: result.userId } : {})
    };
  }
}
