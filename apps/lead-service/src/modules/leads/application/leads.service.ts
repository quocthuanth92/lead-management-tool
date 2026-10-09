import { Inject, Injectable } from '@nestjs/common';

import { Lead } from '../domain/entities/lead.entity';
import { LEAD_CACHE_PORT, LeadCachePort } from '../domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT, LeadRepositoryPort } from '../domain/ports/lead-repository.port';

@Injectable()
export class LeadsService {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT) private readonly leadRepository: LeadRepositoryPort,
    @Inject(LEAD_CACHE_PORT) private readonly leadCache: LeadCachePort
  ) {}

  async createPlaceholderLead(data: Omit<Lead, 'id'>): Promise<Lead> {
    const created = await this.leadRepository.createPlaceholder(data);
    await this.leadCache.setPlaceholderLead(created);
    return created;
  }
}
