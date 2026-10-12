import '@testing-library/jest-dom';
import type { LeadDetails } from '@lead/shared-contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ApiError } from '@/lib/api/client';
import { leadKeys } from '@/lib/query/keys';

import { useLeadDetails } from './useLeadDetails';

const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

const details: LeadDetails = {
  id: 'lead-1',
  customerName: 'Ava Stone',
  phone: '+15551234567',
  email: 'ava@example.com',
  source: 'INTERNAL',
  label: 'UNLABELED',
  message: 'Interested in the SUV',
  hasView: false,
  lastUpdate: '2026-10-12T10:00:00.000Z',
  createdAt: '2026-10-12T09:00:00.000Z',
  activities: [],
  activitiesTotal: 0
};

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function createClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('useLeadDetails', () => {
  it('fetches the lead details by id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, details));
    const client = createClient();

    const { result } = renderHook(() => useLeadDetails('lead-1'), {
      wrapper: createWrapper(client)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(details);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/lead-service/leads/lead-1');
  });

  it('invalidates the inbox list queries after a successful fetch so the lead shows as read', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, details));
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    renderHook(() => useLeadDetails('lead-1'), { wrapper: createWrapper(client) });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: leadKeys.lists() }));
  });

  it('does not invalidate the inbox lists when the lead cannot be loaded', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: 'Lead not found' }));
    const client = createClient();
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useLeadDetails('lead-1'), {
      wrapper: createWrapper(client)
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
