import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { ClockPort } from '../domain/ports/clock.port';
import { LeadActivityRepositoryPort } from '../domain/ports/lead-activity-repository.port';
import { LeadCachePort } from '../domain/ports/lead-cache.port';
import { LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { UserRepositoryPort } from '../../users/domain/ports/user-repository.port';
import { MongooseLeadActivityRepository } from '../infrastructure/repositories/mongoose-lead-activity.repository';
import { AddLeadActivityService } from './add-lead-activity.service';

const USER_ID = '65a000000000000000000001';
const LEAD_ID = '65b000000000000000000001';
const NOW = new Date('2026-10-12T09:00:00.000Z');

type Mocked<T> = { [K in keyof T]: jest.Mock };

describe('AddLeadActivityService', () => {
  let leads: Mocked<Pick<LeadRepositoryPort, 'findOwnedById' | 'touch'>>;
  let activities: Mocked<LeadActivityRepositoryPort>;
  let users: Mocked<Pick<UserRepositoryPort, 'findById'>>;
  let cache: Mocked<Pick<LeadCachePort, 'invalidateLead' | 'invalidateUserLists'>>;
  let clock: ClockPort;
  let service: AddLeadActivityService;

  beforeEach(() => {
    leads = {
      findOwnedById: jest.fn().mockResolvedValue({ id: LEAD_ID, userId: USER_ID }),
      touch: jest.fn().mockResolvedValue(undefined)
    };
    activities = {
      add: jest.fn().mockImplementation(async (input) => ({ id: 'activity-1', ...input })),
      list: jest.fn()
    };
    users = {
      findById: jest.fn().mockResolvedValue({
        id: USER_ID,
        fullName: 'Sam Seller',
        isActive: true,
        role: 'SALESPERSON',
        email: 'sam@example.com',
        passwordHash: 'x'
      })
    };
    cache = {
      invalidateLead: jest.fn().mockResolvedValue(undefined),
      invalidateUserLists: jest.fn().mockResolvedValue(undefined)
    };
    clock = { now: () => NOW };
    service = new AddLeadActivityService(
      leads as never,
      activities as never,
      users as never,
      cache as never,
      clock
    );
  });

  it('trims the content, defaults the type to NOTE, and captures the caller as author', async () => {
    const result = await service.execute(USER_ID, LEAD_ID, { content: '  Called customer  ' });

    expect(activities.add).toHaveBeenCalledWith({
      leadId: LEAD_ID,
      userId: USER_ID,
      authorName: 'Sam Seller',
      type: 'NOTE',
      content: 'Called customer',
      createdAt: NOW
    });
    expect(result).toMatchObject({ id: 'activity-1', authorName: 'Sam Seller', type: 'NOTE' });
  });

  it.each(['', '   ', 'x'.repeat(2001)])('rejects invalid content %j', async (content) => {
    await expect(service.execute(USER_ID, LEAD_ID, { content })).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(activities.add).not.toHaveBeenCalled();
  });

  it('moves the lead last update forward with max semantics and invalidates caches', async () => {
    await service.execute(USER_ID, LEAD_ID, { content: 'Sent promotion', type: 'EMAIL' });

    expect(leads.touch).toHaveBeenCalledWith(USER_ID, LEAD_ID, NOW);
    expect(cache.invalidateLead).toHaveBeenCalledWith(LEAD_ID);
    expect(cache.invalidateUserLists).toHaveBeenCalledWith(USER_ID);
  });

  it('returns NotFound for a missing or foreign lead without writing', async () => {
    leads.findOwnedById.mockResolvedValueOnce(null);

    await expect(service.execute(USER_ID, LEAD_ID, { content: 'hi' })).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(activities.add).not.toHaveBeenCalled();
    expect(leads.touch).not.toHaveBeenCalled();
  });

  it('rejects a caller whose account no longer exists or is inactive', async () => {
    users.findById.mockResolvedValueOnce(null);

    await expect(service.execute(USER_ID, LEAD_ID, { content: 'hi' })).rejects.toBeInstanceOf(
      UnauthorizedException
    );
    expect(activities.add).not.toHaveBeenCalled();
  });

  it('exposes only create and read operations on the activity adapter', () => {
    const operations = Object.getOwnPropertyNames(MongooseLeadActivityRepository.prototype).filter(
      (name) => name !== 'constructor'
    );

    expect(operations.sort()).toEqual(['add', 'list']);
  });
});
