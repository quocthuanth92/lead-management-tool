import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { LeadDetailsView } from './LeadDetailsView';

const fetchMock = jest.fn();

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

const details = {
  id: 'lead-1',
  customerName: 'Ava Stone',
  phone: '+15551234567',
  email: 'ava@example.com',
  source: 'EXTERNAL',
  label: 'UNLABELED',
  message: 'Interested in the SUV',
  hasView: true,
  lastUpdate: '2026-10-12T10:00:00.000Z',
  createdAt: '2026-10-12T09:00:00.000Z',
  activities: [
    {
      id: 'act-1',
      leadId: 'lead-1',
      type: 'NOTE',
      content: 'First contact via website',
      authorName: 'Ava Stone',
      createdAt: '2026-10-12T09:30:00.000Z'
    }
  ],
  activitiesTotal: 1
};

const activityPage = {
  items: details.activities,
  page: 1,
  limit: 50,
  total: 1
};

function routeFetch(detailsResponse: () => Response) {
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/activities')) {
      return Promise.resolve(jsonResponse(200, activityPage));
    }
    return Promise.resolve(detailsResponse());
  });
}

function renderView(returnTo = '/leads?page=2&q=ava') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <QueryClientProvider client={client}>
      <LeadDetailsView leadId="lead-1" returnTo={returnTo} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('LeadDetailsView', () => {
  it('shows a loading state before the lead arrives', async () => {
    routeFetch(() => jsonResponse(200, details));
    renderView();

    expect(screen.getByRole('status')).toHaveTextContent('Loading lead details');
    expect(await screen.findByRole('heading', { name: 'Ava Stone' })).toBeInTheDocument();
  });

  it('shows the lead, its activity and a Back to inbox link to returnTo', async () => {
    routeFetch(() => jsonResponse(200, details));
    renderView('/leads?page=2&q=ava');

    expect(await screen.findByRole('heading', { name: 'Ava Stone' })).toBeInTheDocument();
    expect(screen.getByText('First contact via website')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to inbox' })).toHaveAttribute(
      'href',
      '/leads?page=2&q=ava'
    );
    expect(screen.getByRole('combobox', { name: 'Label' })).toHaveValue('UNLABELED');
  });

  it('shows "Lead not found" with a Back to inbox link when the lead is missing', async () => {
    routeFetch(() => jsonResponse(404, { message: 'Lead not found' }));
    renderView('/leads?page=3');

    expect(await screen.findByText('Lead not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to inbox' })).toHaveAttribute(
      'href',
      '/leads?page=3'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an inline error with Retry on a generic failure, and Retry refetches the lead', async () => {
    let attempts = 0;
    routeFetch(() => {
      attempts += 1;
      return attempts === 1
        ? jsonResponse(500, { message: 'Upstream failure' })
        : jsonResponse(200, details);
    });
    renderView();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load this lead');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Ava Stone' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(attempts).toBe(2);
  });
});
