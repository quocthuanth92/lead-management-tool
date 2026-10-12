import { act, fireEvent, render, screen } from '@testing-library/react';

import type { InboxParams } from '@/lib/leads/inbox-params';

import { InboxToolbar } from './InboxToolbar';

const BASE: InboxParams = {
  q: '',
  label: '',
  from: '2026-04-12',
  to: '2026-10-12',
  page: 1,
  limit: 20
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('InboxToolbar', () => {
  it('debounces search input by 300 ms', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={BASE} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search leads' }), {
      target: { value: 'tran' }
    });
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onChange).toHaveBeenCalledWith({ q: 'tran' });
  });

  it('does not search for a single character and shows a hint instead', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={BASE} onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search leads' }), {
      target: { value: 'a' }
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('clears the search term when the clear button is used', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={{ ...BASE, q: 'tran' }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledWith({ q: '' });
  });

  it('applies the label filter immediately', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={BASE} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'SPAM' } });

    expect(onChange).toHaveBeenCalledWith({ label: 'SPAM' });
  });

  it('shows an inline error and keeps previous results when from is after to', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={BASE} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-01' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Start date must be on or before end date');
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ from: '2026-11-01' }));
  });

  it('applies a valid date range', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={BASE} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-05-01' } });

    expect(onChange).toHaveBeenCalledWith({ from: '2026-05-01', to: '2026-10-12' });
  });

  it('resets to the last six months from the reset button', () => {
    const onChange = jest.fn();
    render(<InboxToolbar params={{ ...BASE, from: '2026-01-01' }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Last 6 months' }));

    expect(onChange).toHaveBeenCalledWith({
      from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    });
  });

  it('shows the search scope only when a search or label filter is active', () => {
    const { rerender } = render(<InboxToolbar params={BASE} onChange={jest.fn()} />);
    expect(screen.queryByText(/Within 2026-04-12/)).not.toBeInTheDocument();

    rerender(<InboxToolbar params={{ ...BASE, label: 'POTENTIAL' }} onChange={jest.fn()} />);
    expect(screen.getByText('Within 2026-04-12 – 2026-10-12')).toBeInTheDocument();
  });
});
