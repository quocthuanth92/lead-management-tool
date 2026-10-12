import { Inject, Injectable, Logger } from '@nestjs/common';

import { LEAD_CACHE_PORT, LeadCachePort } from '../domain/ports/lead-cache.port';
import {
  LEAD_INGESTION_PORT,
  LeadIngestionInput,
  LeadIngestionPort
} from '../domain/ports/lead-ingestion.port';

@Injectable()
export class CreateLeadService {
  private readonly logger = new Logger(CreateLeadService.name);

  constructor(
    @Inject(LEAD_INGESTION_PORT) private readonly leadIngestion: LeadIngestionPort,
    @Inject(LEAD_CACHE_PORT) private readonly leadCache: LeadCachePort
  ) {}

  async execute(input: LeadIngestionInput): Promise<{ id: string }> {
    const result = await this.leadIngestion.ingest(input, { source: 'INTERNAL' });
    if (!('id' in result)) {
      throw new Error('Internal lead ingestion unexpectedly reported a duplicate');
    }
    if (result.userId) {
      await this.leadCache.invalidateUserLists(result.userId);
    }
    this.logger.log(`Internal lead ingested id=${result.id}`);
    return { id: result.id };
  }
}
