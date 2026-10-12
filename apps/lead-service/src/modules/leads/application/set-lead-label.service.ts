import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { LeadLabel, SetLabelResponse } from '@lead/shared-contracts';

import { CLOCK_PORT, ClockPort } from '../domain/ports/clock.port';
import { LEAD_CACHE_PORT, LeadCachePort } from '../domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT, LeadRepositoryPort } from '../domain/ports/lead-repository.port';

@Injectable()
export class SetLeadLabelService {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_CACHE_PORT) private readonly cache: LeadCachePort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort
  ) {}

  async execute(userId: string, leadId: string, label: LeadLabel): Promise<SetLabelResponse> {
    const now = this.clock.now();
    const updated = await this.leads.setLabel(userId, leadId, label, now);
    if (!updated) {
      throw new NotFoundException('Lead not found');
    }

    await this.cache.invalidateLead(leadId);
    await this.cache.invalidateUserLists(userId);
    return { id: leadId, label, lastUpdate: now.toISOString() };
  }
}
