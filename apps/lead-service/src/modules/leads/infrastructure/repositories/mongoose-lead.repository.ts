import { Injectable } from '@nestjs/common';

import { Lead } from '../../domain/entities/lead.entity';
import { LeadRepositoryPort } from '../../domain/ports/lead-repository.port';

@Injectable()
export class MongooseLeadRepository implements LeadRepositoryPort {
  async createPlaceholder(lead: Omit<Lead, 'id'>): Promise<Lead> {
    return {
      id: crypto.randomUUID(),
      ...lead
    };
  }
}
