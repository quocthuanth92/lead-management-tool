import { fireEvent, render, screen, within } from '@testing-library/react';
import type { LeadListItem } from '@lead/shared-contracts';

import { LeadTable } from './LeadTable';

function lead(overrides: Partial<LeadListItem> = {}): LeadListItem {
  return {
    id: '65f1a2b3c4d5e6f7a8b9c0d1',
    customerName: 'Tran Van An',
    phone: '+84912223344',
    email: 'tranvanan@gmail.com',
    label: 'POTENTIAL',
    hasView: false,
    lastUpdate: new Date(Date.now() - 3 * 60_000).toISOString(),
    ...overrides
  };
}

const hrefFor = (leadId: string) => `/leads/${leadId}?returnTo=%2Fleads`;

describe('LeadTable', () => {
  it('marks unread rows with bold text and sr-only Unread text', () => {
    render(
      <LeadTable
        leads={[
          lead({ id: 'a1', hasView: false }),
          lead({ id: 'b2', hasView: true, customerName: 'Read Lead' })
        ]}
        hrefFor={hrefFor}
        emptyMessage="Empty"
      />
    );

    const unreadRow = screen.getByRole('link', { name: /Tran Van An/ });
    expect(within(unreadRow).getByText('Unread')).toHaveClass('sr-only');
    expect(within(unreadRow).getByText('Tran Van An')).toHaveClass('font-semibold');

    const readRow = screen.getByRole('link', { name: /Read Lead/ });
    expect(within(readRow).queryByText('Unread')).not.toBeInTheDocument();
  });

  it('links each row to the lead details route', () => {
    render(
      <LeadTable
        leads={[lead({ id: '65f1a2b3c4d5e6f7a8b9c0d1' })]}
        hrefFor={hrefFor}
        emptyMessage="Empty"
      />
    );

    expect(screen.getByRole('link', { name: /Tran Van An/ })).toHaveAttribute(
      'href',
      '/leads/65f1a2b3c4d5e6f7a8b9c0d1?returnTo=%2Fleads'
    );
  });

  it('renders the empty message when there are no leads', () => {
    render(<LeadTable leads={[]} hrefFor={hrefFor} emptyMessage="No leads in this period." />);

    expect(screen.getByRole('status')).toHaveTextContent('No leads in this period.');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders an error alert with a retry action', () => {
    const onRetry = jest.fn();
    render(
      <LeadTable
        leads={[]}
        hrefFor={hrefFor}
        emptyMessage="Empty"
        errorMessage="Lead service is unavailable"
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Lead service is unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
