import '@testing-library/jest-dom';
import type { LeadDetails } from '@lead/shared-contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import { formatAbsoluteDateTime } from '@/lib/format/relative-time';

import { LeadDetailsCard } from './LeadDetailsCard';

const details: LeadDetails = {
  id: 'lead-1',
  customerName: 'Ava Stone',
  phone: '+15551234567',
  email: 'ava@example.com',
  source: 'INTERNAL',
  label: 'POTENTIAL',
  message: 'Interested in the SUV',
  hasView: false,
  lastUpdate: '2026-10-12T10:00:00.000Z',
  createdAt: '2026-10-12T09:00:00.000Z',
  activities: [],
  activitiesTotal: 0
};

function renderCard(overrides: Partial<LeadDetails> = {}) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LeadDetailsCard details={{ ...details, ...overrides }} />
    </QueryClientProvider>
  );
}

describe('LeadDetailsCard', () => {
  it('shows the name, contact details, message and timestamps', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Ava Stone' })).toBeInTheDocument();
    expect(screen.getByText('+15551234567')).toBeInTheDocument();
    expect(screen.getByText('ava@example.com')).toBeInTheDocument();
    expect(screen.getByText('Interested in the SUV')).toBeInTheDocument();
    expect(screen.getByText(formatAbsoluteDateTime(details.createdAt))).toBeInTheDocument();
    expect(screen.getByText(formatAbsoluteDateTime(details.lastUpdate))).toBeInTheDocument();
  });

  it('shows the current label in the label select', () => {
    renderCard();

    expect(screen.getByRole('combobox', { name: 'Label' })).toHaveValue('POTENTIAL');
  });

  it.each([
    ['INTERNAL', 'Website API'],
    ['EXTERNAL', 'External event']
  ] as const)('shows the %s source as "%s"', (source, sourceText) => {
    renderCard({ source });

    expect(screen.getByText(sourceText)).toBeInTheDocument();
  });

  it('shows a placeholder when the lead has no email address', () => {
    renderCard({ email: undefined });

    expect(screen.getByText('Not provided')).toBeInTheDocument();
    expect(screen.queryByText('ava@example.com')).not.toBeInTheDocument();
  });
});
