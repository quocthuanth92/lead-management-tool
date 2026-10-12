import '@testing-library/jest-dom';
import type { LeadActivityItem } from '@lead/shared-contracts';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { formatAbsoluteDateTime } from '@/lib/format/relative-time';

import { ActivityTimeline } from './ActivityTimeline';

const activities: LeadActivityItem[] = [
  {
    id: 'act-3',
    leadId: 'lead-1',
    type: 'CALL',
    content: 'Left a voicemail',
    authorName: 'Ben Ortiz',
    createdAt: '2026-10-12T11:00:00.000Z'
  },
  {
    id: 'act-2',
    leadId: 'lead-1',
    type: 'EMAIL',
    content: 'Sent the price list',
    authorName: 'Ava Stone',
    createdAt: '2026-10-11T09:00:00.000Z'
  },
  {
    id: 'act-1',
    leadId: 'lead-1',
    type: 'NOTE',
    content: 'First contact via website',
    authorName: 'Ava Stone',
    createdAt: '2026-10-10T08:00:00.000Z'
  }
];

describe('ActivityTimeline', () => {
  it('renders activities in the order provided', () => {
    render(<ActivityTimeline activities={activities} onLoadMore={jest.fn()} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Left a voicemail');
    expect(items[1]).toHaveTextContent('Sent the price list');
    expect(items[2]).toHaveTextContent('First contact via website');
  });

  it('shows the type, author and content, with the relative time and absolute time as its title', () => {
    const { container } = render(
      <ActivityTimeline activities={activities} onLoadMore={jest.fn()} />
    );

    const firstItem = screen.getAllByRole('listitem')[0];
    expect(within(firstItem).getByText('Call')).toBeInTheDocument();
    expect(within(firstItem).getByText('Ben Ortiz')).toBeInTheDocument();
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('dateTime', activities[0].createdAt);
    expect(time).toHaveAttribute('title', formatAbsoluteDateTime(activities[0].createdAt));
    expect(time?.textContent).toMatch(/ago$|just now$/);
  });

  it('renders no edit or delete controls', () => {
    render(<ActivityTimeline activities={activities} hasNextPage onLoadMore={jest.fn()} />);

    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Load more'
    ]);
  });

  it('requests the next page when Load more is clicked', () => {
    const onLoadMore = jest.fn();
    render(<ActivityTimeline activities={activities} hasNextPage onLoadMore={onLoadMore} />);

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('hides Load more when there are no further pages', () => {
    render(<ActivityTimeline activities={activities} onLoadMore={jest.fn()} />);

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('disables Load more while the next page is loading', () => {
    render(
      <ActivityTimeline
        activities={activities}
        hasNextPage
        isFetchingNextPage
        onLoadMore={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Load more' })).toBeDisabled();
  });

  it('shows an empty state when there is no activity', () => {
    render(<ActivityTimeline activities={[]} onLoadMore={jest.fn()} />);

    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
