import { NotFoundException } from '@nestjs/common';

import { ClockPort } from '../domain/ports/clock.port';
import { LeadCachePort } from '../domain/ports/lead-cache.port';
import { LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { SetLeadLabelService } from './set-lead-label.service';

const USER_ID = '65a000000000000000000001';
const LEAD_ID = '65b000000000000000000001';
const NOW = new Date('2026-10-12T09:00:00.000Z');

describe('SetLeadLabelService', () => {
  let repository: jest.Mocked<Pick<LeadRepositoryPort, 'setLabel'>>;
  let cache: jest.Mocked<Pick<LeadCachePort, 'invalidateLead' | 'invalidateUserLists'>>;
  let clock: ClockPort;
  let service: SetLeadLabelService;

  beforeEach(() => {
    repository = {
      setLabel: jest.fn().mockImplementation(async (_user, id, label) => ({
        id,
        label,
        customerName: 'Jane',
        phone: '15555550100',
        message: 'hi',
        source: 'INTERNAL',
        hasView: true,
        createdAt: NOW,
        updatedAt: NOW
      }))
    };
    cache = {
      invalidateLead: jest.fn().mockResolvedValue(undefined),
      invalidateUserLists: jest.fn().mockResolvedValue(undefined)
    };
    clock = { now: () => NOW };
    service = new SetLeadLabelService(
      repository as unknown as LeadRepositoryPort,
      cache as unknown as LeadCachePort,
      clock
    );
  });

  it('replaces the label and moves the last update forward', async () => {
    const result = await service.execute(USER_ID, LEAD_ID, 'POTENTIAL');

    expect(repository.setLabel).toHaveBeenCalledWith(USER_ID, LEAD_ID, 'POTENTIAL', NOW);
    expect(result).toEqual({ id: LEAD_ID, label: 'POTENTIAL', lastUpdate: NOW.toISOString() });
  });

  it('returns NotFound when the lead is missing or belongs to someone else', async () => {
    repository.setLabel.mockResolvedValueOnce(null);

    await expect(service.execute(USER_ID, LEAD_ID, 'SPAM')).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(cache.invalidateLead).not.toHaveBeenCalled();
  });

  it('invalidates the lead and the owner list version', async () => {
    await service.execute(USER_ID, LEAD_ID, 'SPAM');

    expect(cache.invalidateLead).toHaveBeenCalledWith(LEAD_ID);
    expect(cache.invalidateUserLists).toHaveBeenCalledWith(USER_ID);
  });

  it('accepts re-submitting the current label', async () => {
    await expect(service.execute(USER_ID, LEAD_ID, 'UNLABELED')).resolves.toMatchObject({
      label: 'UNLABELED'
    });
  });
});
