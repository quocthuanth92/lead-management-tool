import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ASSIGNMENT_CACHE_INVALIDATOR_PORT,
  AssignmentCacheInvalidatorPort
} from '../domain/ports/assignment-cache-invalidator.port';
import { HELD_LEADS_PORT, HeldLeadsPort } from '../domain/ports/held-leads.port';

export interface AssignHeldLeadsSummary {
  scanned: number;
  assigned: number;
}

@Injectable()
export class AssignHeldLeadsService {
  private readonly logger = new Logger(AssignHeldLeadsService.name);

  constructor(
    @Inject(HELD_LEADS_PORT) private readonly heldLeads: HeldLeadsPort,
    @Inject(ASSIGNMENT_CACHE_INVALIDATOR_PORT)
    private readonly cache: AssignmentCacheInvalidatorPort
  ) {}

  async execute(batchSize: number): Promise<AssignHeldLeadsSummary> {
    const leadIds = await this.heldLeads.listUnassignedLeadIds(batchSize);
    if (leadIds.length === 0) {
      return { scanned: 0, assigned: 0 };
    }

    if (!(await this.heldLeads.hasActiveSalespeople())) {
      return { scanned: leadIds.length, assigned: 0 };
    }

    let assigned = 0;
    for (const leadId of leadIds) {
      const outcome = await this.heldLeads.assignLead(leadId);
      if (!outcome.assigned) {
        continue;
      }
      assigned += 1;
      await this.invalidateSafely(leadId, outcome.assigneeId);
    }

    this.logger.log(`Assigned ${assigned} of ${leadIds.length} held leads`);
    return { scanned: leadIds.length, assigned };
  }

  private async invalidateSafely(leadId: string, assigneeId: string): Promise<void> {
    try {
      await this.cache.invalidateLeadWrite(leadId, assigneeId);
    } catch (error) {
      this.logger.warn(
        `Cache invalidation failed for assigned lead ${leadId} (error=${error instanceof Error ? error.name : 'UnknownError'})`
      );
    }
  }
}
