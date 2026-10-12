import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { LeadLabel, LeadListItem, PAGINATION, PagedResult } from '@lead/shared-contracts';

import { InvalidQueryError } from '../domain/errors/invalid-query.error';
import { CLOCK_PORT, ClockPort } from '../domain/ports/clock.port';
import { LeadSummary } from '../domain/entities/lead.entity';
import { LEAD_CACHE_PORT, LeadCachePort } from '../domain/ports/lead-cache.port';
import {
  LEAD_REPOSITORY_PORT,
  LeadListCriteria,
  LeadRepositoryPort
} from '../domain/ports/lead-repository.port';
import {
  LEAD_SEARCH_INDEX_PORT,
  LeadSearchIndexPort
} from '../domain/ports/lead-search-index.port';
import { resolveDateRange } from '../domain/value-objects/date-range';
import { isMatchable, parseSearchTerm } from '../domain/value-objects/search-term';

export interface ListLeadsInput {
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface SearchLeadsInput extends ListLeadsInput {
  q?: string;
  label?: LeadLabel;
}

@Injectable()
export class ListLeadsService {
  constructor(
    @Inject(LEAD_REPOSITORY_PORT) private readonly leads: LeadRepositoryPort,
    @Inject(LEAD_CACHE_PORT) private readonly cache: LeadCachePort,
    @Inject(LEAD_SEARCH_INDEX_PORT) private readonly index: LeadSearchIndexPort,
    @Inject(CLOCK_PORT) private readonly clock: ClockPort
  ) {}

  async inbox(userId: string, input: ListLeadsInput): Promise<PagedResult<LeadListItem>> {
    return this.run(userId, 'inbox', input, {});
  }

  async search(userId: string, input: SearchLeadsInput): Promise<PagedResult<LeadListItem>> {
    if (input.q === undefined && input.label === undefined) {
      throw new BadRequestException('Provide q or label');
    }
    return this.run(userId, 'search', input, { q: input.q, label: input.label });
  }

  private async run(
    userId: string,
    mode: 'inbox' | 'search',
    input: ListLeadsInput,
    search: { q?: string; label?: LeadLabel }
  ): Promise<PagedResult<LeadListItem>> {
    const page = input.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = input.limit ?? PAGINATION.DEFAULT_LIMIT;
    if (limit > PAGINATION.MAX_LIMIT) {
      throw new BadRequestException(`limit must not exceed ${PAGINATION.MAX_LIMIT}`);
    }

    const criteria = this.buildCriteria(input, search, page, limit);
    if (criteria.term && !isMatchable(criteria.term)) {
      return { items: [], page, limit, total: 0 };
    }

    // Keyed by the raw inputs so a default range (ending "now") still hits the cache.
    const cacheQuery = {
      mode,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      q: criteria.term?.raw ?? null,
      label: criteria.label ?? null,
      page,
      limit
    };
    const version = await this.cache.getVersion(userId);
    const cached = await this.cache.getList<PagedResult<LeadListItem>>(userId, version, cacheQuery);
    if (cached) {
      return cached;
    }

    const result =
      (await this.index.search(userId, version, criteria, () =>
        this.leads.listAllForIndex(userId)
      )) ?? (await this.leads.list(userId, criteria));

    const response: PagedResult<LeadListItem> = {
      items: result.items.map(toListItem),
      page,
      limit,
      total: result.total
    };
    await this.cache.setList(userId, version, cacheQuery, response);
    return response;
  }

  private buildCriteria(
    input: ListLeadsInput,
    search: { q?: string; label?: LeadLabel },
    page: number,
    limit: number
  ): LeadListCriteria {
    try {
      const range = resolveDateRange(
        { fromDate: input.fromDate, toDate: input.toDate },
        this.clock.now()
      );
      const term = search.q !== undefined ? parseSearchTerm(search.q) : undefined;
      return { range, label: search.label, term, page, limit };
    } catch (error) {
      if (error instanceof InvalidQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}

function toListItem(summary: LeadSummary): LeadListItem {
  return {
    id: summary.id,
    customerName: summary.customerName,
    email: summary.email ?? null,
    phone: summary.phone,
    label: summary.label,
    hasView: summary.hasView,
    lastUpdate: summary.lastUpdate.toISOString()
  };
}
