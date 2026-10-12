import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadLabel } from '@lead/shared-contracts';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../../../../core/redis/redis.module';
import { IndexableLead, LeadPage, LeadSummary } from '../../domain/entities/lead.entity';
import { LeadListCriteria } from '../../domain/ports/lead-repository.port';
import { LeadSearchIndexPort } from '../../domain/ports/lead-search-index.port';
import {
  compactOf,
  isMatchable,
  nameTokensOf,
  SearchTerm
} from '../../domain/value-objects/search-term';

const UNREAD_BIAS = 1e13;
const DEFAULT_TTL_SECONDS = 60;
const DOCUMENT_TTL_MARGIN_SECONDS = 60;

const RETURNED_FIELDS = [
  'leadId',
  'customerName',
  'email',
  'phone',
  'label',
  'hasView',
  'lastUpdate'
];

const INDEX_SCHEMA = [
  'nameSearch',
  'TEXT',
  'WITHSUFFIXTRIE',
  'NOSTEM',
  'emailSearch',
  'TEXT',
  'WITHSUFFIXTRIE',
  'NOSTEM',
  'phoneDigits',
  'TEXT',
  'WITHSUFFIXTRIE',
  'NOSTEM',
  'label',
  'TAG',
  'leadId',
  'TEXT',
  'NOINDEX',
  'customerName',
  'TEXT',
  'NOINDEX',
  'email',
  'TEXT',
  'NOINDEX',
  'phone',
  'TEXT',
  'NOINDEX',
  'hasView',
  'NUMERIC',
  'NOINDEX',
  'lastUpdate',
  'TEXT',
  'NOINDEX',
  'lastUpdateMs',
  'NUMERIC',
  'sortKey',
  'NUMERIC',
  'SORTABLE'
];

@Injectable()
export class RedisLeadSearchIndex implements LeadSearchIndexPort {
  private readonly logger = new Logger(RedisLeadSearchIndex.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService
  ) {}

  async search(
    userId: string,
    version: number,
    criteria: LeadListCriteria,
    loadLeads: () => Promise<IndexableLead[]>
  ): Promise<LeadPage | null> {
    if (criteria.term && !isMatchable(criteria.term)) {
      return { items: [], total: 0 };
    }

    try {
      await this.connectIfEnded();
      if ((await this.redis.get(metaKey(userId))) !== String(version)) {
        await this.rebuild(userId, version, loadLeads);
      }
      try {
        return await this.run(userId, criteria);
      } catch (error) {
        if (!isMissingIndex(error)) {
          throw error;
        }
        await this.rebuild(userId, version, loadLeads);
        return await this.run(userId, criteria);
      }
    } catch {
      this.logger.warn('Lead search index unavailable; serving the request from MongoDB');
      return null;
    }
  }

  private async rebuild(
    userId: string,
    version: number,
    loadLeads: () => Promise<IndexableLead[]>
  ): Promise<void> {
    const leads = await loadLeads();
    const ttlSeconds = this.configService.get<number>(
      'CACHE_LIST_TTL_SECONDS',
      DEFAULT_TTL_SECONDS
    );
    const documentTtlMs = (ttlSeconds + DOCUMENT_TTL_MARGIN_SECONDS) * 1000;
    const prefix = documentPrefix(userId);

    try {
      await this.redis.call('FT.DROPINDEX', indexName(userId));
    } catch (error) {
      if (!isMissingIndex(error)) {
        throw error;
      }
    }
    try {
      await this.redis.call(
        'FT.CREATE',
        indexName(userId),
        'ON',
        'HASH',
        'PREFIX',
        '1',
        prefix,
        'STOPWORDS',
        '0',
        'SCHEMA',
        ...INDEX_SCHEMA
      );
    } catch (error) {
      if (!isIndexExists(error)) {
        throw error;
      }
    }

    const pipeline = this.redis.pipeline();
    for (const lead of leads) {
      const key = prefix + lead.id;
      pipeline.hset(key, toHash(lead));
      pipeline.pexpire(key, documentTtlMs);
    }
    // Written last so a query never trusts an index that is still being filled.
    pipeline.set(metaKey(userId), String(version), 'EX', ttlSeconds);
    const results = await pipeline.exec();
    if (results?.some(([error]) => error)) {
      throw new Error('Lead search index write failed');
    }
  }

  private async run(userId: string, criteria: LeadListCriteria): Promise<LeadPage> {
    const offset = (criteria.page - 1) * criteria.limit;
    const reply = (await this.redis.call(
      'FT.SEARCH',
      indexName(userId),
      buildQuery(criteria),
      'SORTBY',
      'sortKey',
      'DESC',
      'LIMIT',
      String(offset),
      String(criteria.limit),
      'RETURN',
      String(RETURNED_FIELDS.length),
      ...RETURNED_FIELDS
    )) as unknown[];

    const items: LeadSummary[] = [];
    for (let index = 1; index < reply.length; index += 2) {
      items.push(toSummary(reply[index + 1] as string[]));
    }
    return { items, total: Number(reply[0]) };
  }

  private async connectIfEnded(): Promise<void> {
    if (this.redis.status === 'end') {
      await this.redis.connect();
    }
  }
}

function indexName(userId: string): string {
  return `leads_idx_${userId}`;
}

function documentPrefix(userId: string): string {
  return `leadidx:${userId}:`;
}

function metaKey(userId: string): string {
  return `leadidx:meta:${userId}`;
}

function buildQuery(criteria: LeadListCriteria): string {
  const parts = [`@lastUpdateMs:[${criteria.range.from.getTime()} ${criteria.range.to.getTime()}]`];
  if (criteria.label) {
    parts.push(`@label:{${criteria.label}}`);
  }
  if (criteria.term) {
    parts.push(`(${termClauses(criteria.term).join(' | ')})`);
  }
  return parts.join(' ');
}

function termClauses(term: SearchTerm): string[] {
  const clauses: string[] = [];
  if (term.nameTokens.length > 0) {
    clauses.push(`(@nameSearch:(${term.nameTokens.map((token) => `*${token}*`).join(' ')}))`);
  }
  if (term.emailFragment) {
    clauses.push(`(@emailSearch:*${term.emailFragment}*)`);
  }
  if (term.phoneDigits) {
    clauses.push(`(@phoneDigits:*${term.phoneDigits}*)`);
  }
  return clauses;
}

function toHash(lead: IndexableLead): Record<string, string | number> {
  const lastUpdateMs = lead.lastUpdate.getTime();
  return {
    leadId: lead.id,
    nameSearch: nameTokensOf(lead.fullNameSearch).join(' '),
    emailSearch: lead.emailLower ? compactOf(lead.emailLower) : '',
    phoneDigits: lead.phoneDigits,
    label: lead.label,
    customerName: lead.customerName,
    email: lead.email ?? '',
    phone: lead.phone,
    hasView: lead.hasView ? 1 : 0,
    lastUpdate: lead.lastUpdate.toISOString(),
    lastUpdateMs,
    sortKey: (lead.hasView ? 0 : UNREAD_BIAS) + lastUpdateMs
  };
}

function toSummary(flat: string[]): LeadSummary {
  const fields = new Map<string, string>();
  for (let index = 0; index < flat.length; index += 2) {
    fields.set(flat[index], flat[index + 1]);
  }
  return {
    id: fields.get('leadId') ?? '',
    customerName: fields.get('customerName') ?? '',
    email: fields.get('email') || undefined,
    phone: fields.get('phone') ?? '',
    label: (fields.get('label') ?? 'UNLABELED') as LeadLabel,
    hasView: fields.get('hasView') === '1',
    lastUpdate: new Date(fields.get('lastUpdate') ?? 0)
  };
}

function isMissingIndex(error: unknown): boolean {
  return error instanceof Error && /No such index|Unknown Index name/i.test(error.message);
}

function isIndexExists(error: unknown): boolean {
  return error instanceof Error && /Index already exists/i.test(error.message);
}
