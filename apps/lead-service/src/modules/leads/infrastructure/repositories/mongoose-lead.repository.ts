import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { LeadAttrs } from '@lead/persistence';
import type { LeadLabel } from '@lead/shared-contracts';
import { FilterQuery, Model } from 'mongoose';

import { IndexableLead, Lead, LeadPage, LeadSummary } from '../../domain/entities/lead.entity';
import { LeadListCriteria, LeadRepositoryPort } from '../../domain/ports/lead-repository.port';
import { SearchTerm } from '../../domain/value-objects/search-term';

const LIST_PROJECTION = 'fullName email phone label hasView updatedAt';
const INDEX_PROJECTION =
  'fullName email phone label hasView updatedAt fullNameSearch emailLower phoneDigits';

type LeadRow = LeadAttrs & { _id: unknown };

@Injectable()
export class MongooseLeadRepository implements LeadRepositoryPort {
  constructor(@InjectModel('Lead') private readonly leadModel: Model<LeadAttrs>) {}

  async findOwnedById(userId: string, leadId: string): Promise<Lead | null> {
    const row = await this.leadModel.findOne({ _id: leadId, userId }).lean<LeadRow>().exec();
    return row ? toLead(row) : null;
  }

  async markRead(userId: string, leadId: string): Promise<boolean> {
    const result = await this.leadModel
      .updateOne({ _id: leadId, userId, hasView: false }, { $set: { hasView: true } })
      .exec();
    return result.modifiedCount === 1;
  }

  async setLabel(userId: string, leadId: string, label: LeadLabel, at: Date): Promise<Lead | null> {
    const row = await this.leadModel
      .findOneAndUpdate({ _id: leadId, userId }, { $set: { label, updatedAt: at } }, { new: true })
      .lean<LeadRow>()
      .exec();
    return row ? toLead(row) : null;
  }

  async touch(userId: string, leadId: string, at: Date): Promise<void> {
    await this.leadModel.updateOne({ _id: leadId, userId }, { $max: { updatedAt: at } }).exec();
  }

  async list(userId: string, criteria: LeadListCriteria): Promise<LeadPage> {
    const filter = buildListFilter(userId, criteria);
    const [rows, total] = await Promise.all([
      this.leadModel
        .find(filter, LIST_PROJECTION)
        .sort({ hasView: 1, updatedAt: -1, _id: -1 })
        .skip((criteria.page - 1) * criteria.limit)
        .limit(criteria.limit)
        .lean<LeadRow[]>()
        .exec(),
      this.leadModel.countDocuments(filter).exec()
    ]);
    return { items: rows.map(toSummary), total };
  }

  async listAllForIndex(userId: string): Promise<IndexableLead[]> {
    const rows = await this.leadModel.find({ userId }, INDEX_PROJECTION).lean<LeadRow[]>().exec();
    return rows.map((row) => ({
      ...toSummary(row),
      fullNameSearch: row.fullNameSearch,
      ...(row.emailLower ? { emailLower: row.emailLower } : {}),
      phoneDigits: row.phoneDigits
    }));
  }
}

function buildListFilter(userId: string, criteria: LeadListCriteria): FilterQuery<LeadAttrs> {
  const filter: Record<string, unknown> = {
    userId,
    updatedAt: { $gte: criteria.range.from, $lte: criteria.range.to }
  };
  if (criteria.label) {
    filter.label = criteria.label;
  }
  if (criteria.term) {
    filter.$or = termFilters(criteria.term);
  }
  return filter as FilterQuery<LeadAttrs>;
}

function termFilters(term: SearchTerm): Record<string, unknown>[] {
  // Fallback plan: the {userId, hasView, updatedAt} index bounds candidates. On the integration
  // dataset the 'jane' search examined 5 documents; revisit the research R-06 rule above ~5,000.
  const clauses: Record<string, unknown>[] = [];
  if (term.nameTokens.length > 0) {
    clauses.push({
      $and: term.nameTokens.map((token) => ({ fullNameSearch: { $regex: escapeRegex(token) } }))
    });
  }
  if (term.emailFragment) {
    clauses.push({ emailLower: { $regex: separatorTolerantPattern(term.emailFragment) } });
  }
  if (term.phoneDigits) {
    clauses.push({ phoneDigits: { $regex: escapeRegex(term.phoneDigits) } });
  }
  return clauses;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function separatorTolerantPattern(fragment: string): string {
  return Array.from(fragment).map(escapeRegex).join('[^a-z0-9]*');
}

function toSummary(row: LeadRow): LeadSummary {
  return {
    id: String(row._id),
    customerName: row.fullName,
    ...(row.email ? { email: row.email } : {}),
    phone: row.phone,
    label: row.label as LeadLabel,
    hasView: row.hasView,
    lastUpdate: row.updatedAt
  };
}

function toLead(row: LeadRow): Lead {
  return {
    id: String(row._id),
    ...(row.userId ? { userId: String(row.userId) } : {}),
    customerName: row.fullName,
    phone: row.phone,
    ...(row.email ? { email: row.email } : {}),
    message: row.message,
    source: row.source,
    label: row.label as LeadLabel,
    hasView: row.hasView,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
