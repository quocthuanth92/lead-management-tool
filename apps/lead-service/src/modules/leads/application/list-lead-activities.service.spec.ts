import { BadRequestException, NotFoundException } from '@nestjs/common';

import { LeadActivityRepositoryPort } from '../domain/ports/lead-activity-repository.port';
import { LeadRepositoryPort } from '../domain/ports/lead-repository.port';
import { ListLeadActivitiesService } from './list-lead-activities.service';

const USER_ID = '65a000000000000000000001';
const LEAD_ID = '65b000000000000000000001';
const NOW = new Date('2026-10-12T09:00:00.000Z');

describe('ListLeadActivitiesService', () => {
  it('checks ownership, then returns newest-first pages with the total', async () => {
    const leads = { findOwnedById: jest.fn().mockResolvedValue({ id: LEAD_ID }) };
    const activities = {
      add: jest.fn(),
      list: jest.fn().mockResolvedValue({
        items: [
          {
            id: 'a2',
            leadId: LEAD_ID,
            userId: USER_ID,
            authorName: 'Sam',
            type: 'CALL',
            content: 'Newer',
            createdAt: NOW
          }
        ],
        total: 3
      })
    };
    const service = new ListLeadActivitiesService(
      leads as unknown as LeadRepositoryPort,
      activities as unknown as LeadActivityRepositoryPort
    );

    const page = await service.execute(USER_ID, LEAD_ID, { page: 2, limit: 1 });

    expect(activities.list).toHaveBeenCalledWith(LEAD_ID, 2, 1);
    expect(page).toEqual({
      items: [
        {
          id: 'a2',
          leadId: LEAD_ID,
          type: 'CALL',
          content: 'Newer',
          authorName: 'Sam',
          createdAt: NOW.toISOString()
        }
      ],
      page: 2,
      limit: 1,
      total: 3
    });
  });

  it('returns NotFound for a foreign lead without listing its activities', async () => {
    const leads = { findOwnedById: jest.fn().mockResolvedValue(null) };
    const activities = { add: jest.fn(), list: jest.fn() };
    const service = new ListLeadActivitiesService(
      leads as unknown as LeadRepositoryPort,
      activities as unknown as LeadActivityRepositoryPort
    );

    await expect(service.execute(USER_ID, LEAD_ID, { page: 1, limit: 20 })).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(activities.list).not.toHaveBeenCalled();
  });

  it('rejects a limit above 200', async () => {
    const service = new ListLeadActivitiesService(
      { findOwnedById: jest.fn() } as unknown as LeadRepositoryPort,
      { add: jest.fn(), list: jest.fn() } as unknown as LeadActivityRepositoryPort
    );

    await expect(service.execute(USER_ID, LEAD_ID, { page: 1, limit: 201 })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});
