import type { AssignmentCacheInvalidatorPort } from '../domain/ports/assignment-cache-invalidator.port';
import type { HeldLeadsPort } from '../domain/ports/held-leads.port';
import { AssignHeldLeadsService } from './assign-held-leads.service';

describe('AssignHeldLeadsService', () => {
  let heldLeads: jest.Mocked<HeldLeadsPort>;
  let cache: jest.Mocked<AssignmentCacheInvalidatorPort>;
  let service: AssignHeldLeadsService;

  beforeEach(() => {
    heldLeads = {
      listUnassignedLeadIds: jest.fn().mockResolvedValue([]),
      hasActiveSalespeople: jest.fn().mockResolvedValue(true),
      assignLead: jest.fn()
    };
    cache = { invalidateLeadWrite: jest.fn().mockResolvedValue(undefined) };
    service = new AssignHeldLeadsService(heldLeads, cache);
  });

  it('assigns the held leads it is given, oldest first, up to the batch size', async () => {
    heldLeads.listUnassignedLeadIds.mockResolvedValue(['lead-old', 'lead-mid']);
    heldLeads.assignLead.mockResolvedValue({ assigned: true, assigneeId: 'user-a' });

    const summary = await service.execute(2);

    expect(heldLeads.listUnassignedLeadIds).toHaveBeenCalledWith(2);
    expect(heldLeads.assignLead.mock.calls.map(([leadId]) => leadId)).toEqual([
      'lead-old',
      'lead-mid'
    ]);
    expect(summary).toEqual({ scanned: 2, assigned: 2 });
  });

  it('skips a held lead whose conditional update lost a race', async () => {
    heldLeads.listUnassignedLeadIds.mockResolvedValue(['lead-1', 'lead-2', 'lead-3']);
    heldLeads.assignLead
      .mockResolvedValueOnce({ assigned: true, assigneeId: 'user-a' })
      .mockResolvedValueOnce({ assigned: false })
      .mockResolvedValueOnce({ assigned: true, assigneeId: 'user-b' });

    const summary = await service.execute(10);

    expect(summary).toEqual({ scanned: 3, assigned: 2 });
    expect(cache.invalidateLeadWrite).toHaveBeenCalledTimes(2);
    expect(cache.invalidateLeadWrite).not.toHaveBeenCalledWith('lead-2', expect.anything());
  });

  it('is a no-op when no salesperson is active', async () => {
    heldLeads.listUnassignedLeadIds.mockResolvedValue(['lead-1', 'lead-2']);
    heldLeads.hasActiveSalespeople.mockResolvedValue(false);

    const summary = await service.execute(10);

    expect(heldLeads.assignLead).not.toHaveBeenCalled();
    expect(cache.invalidateLeadWrite).not.toHaveBeenCalled();
    expect(summary).toEqual({ scanned: 2, assigned: 0 });
  });

  it('is a no-op when there are no held leads', async () => {
    const summary = await service.execute(10);

    expect(heldLeads.assignLead).not.toHaveBeenCalled();
    expect(summary).toEqual({ scanned: 0, assigned: 0 });
  });

  it('invalidates the assignee cache for every lead it assigns', async () => {
    heldLeads.listUnassignedLeadIds.mockResolvedValue(['lead-1', 'lead-2']);
    heldLeads.assignLead
      .mockResolvedValueOnce({ assigned: true, assigneeId: 'user-a' })
      .mockResolvedValueOnce({ assigned: true, assigneeId: 'user-b' });

    await service.execute(10);

    expect(cache.invalidateLeadWrite).toHaveBeenNthCalledWith(1, 'lead-1', 'user-a');
    expect(cache.invalidateLeadWrite).toHaveBeenNthCalledWith(2, 'lead-2', 'user-b');
  });

  it('keeps assigning when Redis invalidation fails', async () => {
    heldLeads.listUnassignedLeadIds.mockResolvedValue(['lead-1']);
    heldLeads.assignLead.mockResolvedValue({ assigned: true, assigneeId: 'user-a' });
    cache.invalidateLeadWrite.mockRejectedValue(new Error('redis down'));

    await expect(service.execute(10)).resolves.toEqual({ scanned: 1, assigned: 1 });
  });
});
