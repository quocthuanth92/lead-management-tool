import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { DEFAULT_ACTIVITY_TYPE, LIMITS } from '@lead/shared-contracts';
import type { ActivityType, LeadActivityItem } from '@lead/shared-contracts';

import { CLOCK_PORT, ClockPort } from '../domain/ports/clock.port';
import {
  LEAD_ACTIVITY_REPOSITORY_PORT,
  LeadActivityRepositoryPort
} from '../domain/ports/lead-activity-repository.port';
import { LEAD_CACHE_PORT, LeadCachePort } from '../domain/ports/lead-cache.port';
import { LEAD_REPOSITORY_PORT, LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort
} from '../../users/domain/ports/user-repository.port';
import { toActivityItem } from './lead-mappers';

export interface AddLeadActivityInput {
  type?: ActivityType;
  content: string;
}

@Injectable()
export class AddLeadActivityService {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_ACTIVITY_REPOSITORY_PORT) private readonly activities: LeadActivityRepositoryPort,
    @Inject(USER_REPOSITORY_PORT) private readonly users: UserRepositoryPort,
    @Inject(LEAD_CACHE_PORT) private readonly cache: LeadCachePort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort
  ) {}

  async execute(
    userId: string,
    leadId: string,
    input: AddLeadActivityInput
  ): Promise<LeadActivityItem> {
    const lead = await this.leads.findOwnedById(userId, leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    const author = await this.users.findById(userId);
    if (!author || !author.isActive) {
      throw new UnauthorizedException();
    }

    const content = input.content.trim();
    if (content.length < 1 || content.length > LIMITS.NOTE_MAX || !/\S/.test(content)) {
      throw new BadRequestException('Activity content is invalid');
    }

    const createdAt = this.clock.now();
    const activity = await this.activities.add({
      leadId,
      userId,
      authorName: author.fullName,
      type: input.type ?? DEFAULT_ACTIVITY_TYPE,
      content,
      createdAt
    });
    await this.leads.touch(userId, leadId, createdAt);
    await this.cache.invalidateLead(leadId);
    await this.cache.invalidateUserLists(userId);
    return toActivityItem(activity);
  }
}
