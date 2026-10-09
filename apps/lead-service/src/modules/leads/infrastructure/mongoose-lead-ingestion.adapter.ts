import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  CounterAttrs,
  LeadAttrs,
  LeadWriter,
  MongoLeadWriterStore,
  UserAttrs
} from '@lead/persistence';
import { Model } from 'mongoose';

import { LeadIngestionInput, LeadIngestionPort } from '../domain/ports/lead-ingestion.port';

@Injectable()
export class MongooseLeadIngestionAdapter implements LeadIngestionPort {
  private readonly writer: LeadWriter;

  constructor(
    @InjectModel('User') userModel: Model<UserAttrs>,
    @InjectModel('Lead') leadModel: Model<LeadAttrs>,
    @InjectModel('Counter') counterModel: Model<CounterAttrs>
  ) {
    this.writer = new LeadWriter(
      new MongoLeadWriterStore({ User: userModel, Lead: leadModel, Counter: counterModel })
    );
  }

  ingest(
    input: LeadIngestionInput,
    context: { source: 'INTERNAL' | 'EXTERNAL'; externalEventId?: string }
  ) {
    return this.writer.writeLead(input, context);
  }
}
