import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { LeadDetails } from '@lead/shared-contracts';
import { PAGINATION } from '@lead/shared-contracts';

import {
  LEAD_ACTIVITY_REPOSITORY_PORT,
  LeadActivityRepositoryPort
} from '../domain/ports/lead-activity-repository.port';
import { LEAD_CACHE_PORT, LeadCachePort, CachedLeadRecord } from '../domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT, LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { toActivityItem, toCachedRecord } from './lead-mappers';

@Injectable()
export class GetLeadDetailsService {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY_PORT) private readonly activities: LeadActivityRepositoryPort,
    @Inject(LEAD_CACHE_PORT) private readonly cache: LeadCachePort
  ) {}

  async execute(userId: string, leadId: string): Promise<LeadDetails> {
    const cached = await this.cache.getLead(leadId);
    if (cached && cached.userId !== userId) {
      throw notFound();
    }

    let record: CachedLeadRecord = cached ?? (await this.loadOwned(userId, leadId));
    if (!record.hasView) {
      const changed = await this.leads.markRead(userId, leadId);
      record = { ...record, hasView: true };
      if (changed) {
        await this.cache.invalidateLead(leadId);
        await this.cache.invalidateUserLists(userId);
      }
      await this.cache.setLead(leadId, record);
    } else if (!cached) {
      await this.cache.setLead(leadId, record);
    }

    const { items, total } = await this.activities.list(
      leadId,
      PAGINATION.DEFAULT_PAGE,
      PAGINATION.ACTIVITIES_IN_DETAILS
    );
    return {
      id: record.id,
      customerName: record.customerName,
      phone: record.phone,
      email: record.email,
      source: record.source,
      message: record.message,
      label: record.label,
      hasView: record.hasView,
      createdAt: record.createdAt,
      lastUpdate: record.lastUpdate,
      activities: items.map(toActivityItem),
      activitiesTotal: total
    };
  }

  private async loadOwned(userId: string, leadId: string): Promise<CachedLeadRecord> {
    const lead = await this.leads.findOwnedById(userId, leadId);
    if (!lead) {
      throw notFound();
    }
    return toCachedRecord(lead, userId);
  }
}

function notFound(): NotFoundException {
  return new NotFoundException('Lead not found');
}
