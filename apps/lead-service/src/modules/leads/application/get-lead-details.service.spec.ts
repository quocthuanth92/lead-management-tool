import { NotFoundException } from '@nestjs/common';

import { CachedLeadRecord, LeadCachePort } from '../domain/ports/lead-cache.port';
import { LeadActivityRepositoryPort } from '../domain/ports/lead-activity-repository.port';
import { LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { Lead } from '../domain/entities/lead.entity';
import { GetLeadDetailsService } from './get-lead-details.service';

const USER_ID = '65a000000000000000000001';
const OTHER_USER_ID = '65a000000000000000000002';
const LEAD_ID = '65b000000000000000000001';
const CREATED_AT = new Date('2026-10-01T08:00:00.000Z');
const UPDATED_AT = new Date('2026-10-02T08:00:00.000Z');

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: LEAD_ID,
    userId: USER_ID,
    customerName: 'Jane Doe',
    phone: '15555550100',
    email: 'jane@example.com',
    message: 'Interested in the SUV',
    source: 'INTERNAL',
    label: 'UNLABELED',
    hasView: false,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides
  };
}

function cachedRecord(overrides: Partial<CachedLeadRecord> = {}): CachedLeadRecord {
  return {
    id: LEAD_ID,
    userId: USER_ID,
    customerName: 'Jane Doe',
    phone: '15555550100',
    email: 'jane@example.com',
    message: 'Interested in the SUV',
    source: 'INTERNAL',
    label: 'UNLABELED',
    hasView: false,
    createdAt: CREATED_AT.toISOString(),
    lastUpdate: UPDATED_AT.toISOString(),
    ...overrides
  };
}

describe('GetLeadDetailsService', () => {
  let repository: jest.Mocked<Pick<LeadRepositoryPort, 'findOwnedById' | 'markRead'>>;
  let activities: jest.Mocked<LeadActivityRepositoryPort>;
  let cache: jest.Mocked<LeadCachePort>;
  let service: GetLeadDetailsService;

  beforeEach(() => {
    repository = {
      findOwnedById: jest.fn().mockResolvedValue(lead()),
      markRead: jest.fn().mockResolvedValue(true)
    };
    activities = {
      add: jest.fn(),
      list: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'a2',
            leadId: LEAD_ID,
            userId: USER_ID,
            authorName: 'Sam',
            type: 'CALL',
            content: 'Second',
            createdAt: new Date('2026-10-03T08:00:00.000Z')
          },
          {
            id: 'a1',
            leadId: LEAD_ID,
            userId: USER_ID,
            authorName: 'Sam',
            type: 'NOTE',
            content: 'First',
            createdAt: new Date('2026-10-02T09:00:00.000Z')
          }
        ],
        total: 2
      })
    };
    cache = {
      getVersion: jest.fn(),
      getList: jest.fn(),
      setList: jest.fn(),
      getLead: jest.fn().mockResolvedValue(null),
      setLead: jest.fn().mockResolvedValue(undefined),
      invalidateLead: jest.fn().mockResolvedValue(undefined),
      invalidateUserLists: jest.fn().mockResolvedValue(undefined)
    };
    service = new GetLeadDetailsService(
      repository as unknown as LeadRepositoryPort,
      activities,
      cache
    );
  });

  it('returns NotFound with the same body for a missing lead and a foreign lead', async () => {
    repository.findOwnedById.mockResolvedValueOnce(null);
    const missing = await service.execute(USER_ID, LEAD_ID).catch((error) => error);

    cache.getLead.mockResolvedValueOnce(cachedRecord({ userId: OTHER_USER_ID }));
    const foreign = await service.execute(USER_ID, LEAD_ID).catch((error) => error);

    expect(missing).toBeInstanceOf(NotFoundException);
    expect(foreign).toBeInstanceOf(NotFoundException);
    expect(foreign.message).toBe(missing.message);
    expect(repository.markRead).not.toHaveBeenCalled();
  });

  it('marks an unread lead as read once and invalidates the lead and the owner list version', async () => {
    const details = await service.execute(USER_ID, LEAD_ID);

    expect(repository.markRead).toHaveBeenCalledTimes(1);
    expect(repository.markRead).toHaveBeenCalledWith(USER_ID, LEAD_ID);
    expect(cache.invalidateLead).toHaveBeenCalledWith(LEAD_ID);
    expect(cache.invalidateUserLists).toHaveBeenCalledWith(USER_ID);
    expect(details.hasView).toBe(true);
  });

  it('skips the write and invalidation when the lead is already read', async () => {
    repository.findOwnedById.mockResolvedValueOnce(lead({ hasView: true }));

    await service.execute(USER_ID, LEAD_ID);

    expect(repository.markRead).not.toHaveBeenCalled();
    expect(cache.invalidateLead).not.toHaveBeenCalled();
    expect(cache.invalidateUserLists).not.toHaveBeenCalled();
  });

  it('verifies ownership on a cache hit and still marks an unread lead as read', async () => {
    cache.getLead.mockResolvedValueOnce(cachedRecord({ hasView: false }));

    await service.execute(USER_ID, LEAD_ID);

    expect(repository.findOwnedById).not.toHaveBeenCalled();
    expect(repository.markRead).toHaveBeenCalledWith(USER_ID, LEAD_ID);
  });

  it('returns activities newest first with the total, leaving updatedAt unchanged', async () => {
    const details = await service.execute(USER_ID, LEAD_ID);

    expect(activities.list).toHaveBeenCalledWith(LEAD_ID, 1, 50);
    expect(details.activities.map((activity) => activity.id)).toEqual(['a2', 'a1']);
    expect(details.activitiesTotal).toBe(2);
    expect(details.lastUpdate).toBe(UPDATED_AT.toISOString());
  });
});
