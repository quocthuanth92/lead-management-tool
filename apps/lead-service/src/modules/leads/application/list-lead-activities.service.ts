import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PAGINATION } from '@lead/shared-contracts';
import type { LeadActivityItem, PagedResult } from '@lead/shared-contracts';

import {
  LEAD_ACTIVITY_REPOSITORY_PORT,
  LeadActivityRepositoryPort
} from '../domain/ports/lead-activity-repository.port';
import { LEAD_REPOSITORY_PORT, LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { toActivityItem } from './lead-mappers';

export interface ListActivitiesInput {
  page: number;
  limit: number;
}

@Injectable()
export class ListLeadActivitiesService {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY_PORT) private readonly activities: LeadActivityRepositoryPort
  ) {}

  async execute(
    userId: string,
    leadId: string,
    input: ListActivitiesInput
  ): Promise<PagedResult<LeadActivityItem>> {
    if (input.limit > PAGINATION.MAX_LIMIT) {
      throw new BadRequestException(`limit must not exceed ${PAGINATION.MAX_LIMIT}`);
    }
    const lead = await this.leads.findOwnedById(userId, leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const result = await this.activities.list(leadId, input.page, input.limit);
    return {
      items: result.items.map(toActivityItem),
      page: input.page,
      limit: input.limit,
      total: result.total
    };
  }
}
