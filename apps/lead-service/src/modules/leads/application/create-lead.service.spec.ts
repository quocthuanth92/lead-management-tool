import { Logger } from '@nestjs/common';

import { CreateLeadService } from './create-lead.service';
import { LeadCachePort } from '../domain/ports/lead-cache.port';
import { LeadIngestionPort } from '../domain/ports/lead-ingestion.port';

describe('CreateLeadService', () => {
  it('ingests as INTERNAL and invalidates only the assigned salesperson list', async () => {
    const ingestion: jest.Mocked<LeadIngestionPort> = {
      ingest: jest.fn().mockResolvedValue({
        duplicate: false,
        id: 'lead-id',
        userId: 'salesperson-id'
      })
    };
    const cache: jest.Mocked<LeadCachePort> = {
      getVersion: jest.fn(),
      getList: jest.fn(),
      setList: jest.fn(),
      getLead: jest.fn(),
      setLead: jest.fn(),
      invalidateLead: jest.fn(),
      invalidateUserLists: jest.fn()
    };
    const service = new CreateLeadService(ingestion, cache);
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const input = {
      fullName: 'Name',
      phone: '+15555555555',
      email: 'name@example.com',
      message: 'Message'
    };

    await expect(service.execute(input)).resolves.toEqual({ id: 'lead-id' });
    expect(ingestion.ingest).toHaveBeenCalledWith(input, { source: 'INTERNAL' });
    expect(cache.invalidateUserLists).toHaveBeenCalledWith('salesperson-id');
    expect(logSpy).toHaveBeenCalledWith('Internal lead ingested id=lead-id');
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(input.fullName);
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(input.phone);
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(input.email);
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(input.message);
    logSpy.mockRestore();
  });

  it('does not invalidate list caches when the lead is held unassigned', async () => {
    const ingestion = {
      ingest: jest.fn().mockResolvedValue({ duplicate: false, id: 'lead-id' })
    } as unknown as LeadIngestionPort;
    const cache: jest.Mocked<LeadCachePort> = {
      getVersion: jest.fn(),
      getList: jest.fn(),
      setList: jest.fn(),
      getLead: jest.fn(),
      setLead: jest.fn(),
      invalidateLead: jest.fn(),
      invalidateUserLists: jest.fn()
    };

    await new CreateLeadService(ingestion, cache).execute({
      fullName: 'Name',
      phone: '15555555555',
      message: 'Message'
    });
    expect(cache.invalidateUserLists).not.toHaveBeenCalled();
  });
});
