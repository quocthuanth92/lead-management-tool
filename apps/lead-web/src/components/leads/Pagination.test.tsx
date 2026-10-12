import { fireEvent, render, screen } from '@testing-library/react';

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('shows the visible range and total', () => {
    render(
      <Pagination
        page={1}
        limit={20}
        total={248}
        onPageChange={jest.fn()}
        onLimitChange={jest.fn()}
      />
    );

    expect(screen.getByText('Showing 1–20 of 248')).toBeInTheDocument();
  });

  it('disables Previous on the first page and moves forward on Next', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination
        page={1}
        limit={20}
        total={248}
        onPageChange={onPageChange}
        onLimitChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Next on the last page and shows the partial range', () => {
    render(
      <Pagination
        page={13}
        limit={20}
        total={248}
        onPageChange={jest.fn()}
        onLimitChange={jest.fn()}
      />
    );

    expect(screen.getByText('Showing 241–248 of 248')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('reports rows-per-page changes', () => {
    const onLimitChange = jest.fn();
    render(
      <Pagination
        page={1}
        limit={20}
        total={248}
        onPageChange={jest.fn()}
        onLimitChange={onLimitChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('reports zero results without a range', () => {
    render(
      <Pagination
        page={1}
        limit={20}
        total={0}
        onPageChange={jest.fn()}
        onLimitChange={jest.fn()}
      />
    );

    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
