import type { LeadActivityItem } from '@lead/shared-contracts';

import { LeadActivity } from '../domain/entities/lead-activity.entity';
import { Lead } from '../domain/entities/lead.entity';
import { CachedLeadRecord } from '../domain/ports/lead-cache.port';

export function toActivityItem(activity: LeadActivity): LeadActivityItem {
  return {
    id: activity.id,
    leadId: activity.leadId,
    type: activity.type,
    content: activity.content,
    authorName: activity.authorName,
    createdAt: activity.createdAt.toISOString()
  };
}

export function toCachedRecord(lead: Lead, userId: string): CachedLeadRecord {
  return {
    id: lead.id,
    userId,
    customerName: lead.customerName,
    phone: lead.phone,
    email: lead.email ?? null,
    message: lead.message,
    source: lead.source,
    label: lead.label,
    hasView: lead.hasView,
    createdAt: lead.createdAt.toISOString(),
    lastUpdate: lead.updatedAt.toISOString()
  };
}
