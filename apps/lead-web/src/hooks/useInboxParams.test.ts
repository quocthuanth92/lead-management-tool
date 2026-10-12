import { act, renderHook } from '@testing-library/react';

import { useInboxParams } from './useInboxParams';

let mockSearch = '';
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/leads',
  useSearchParams: () => ({ toString: () => mockSearch })
}));

beforeEach(() => {
  mockSearch = '';
  mockReplace.mockReset();
});

describe('useInboxParams', () => {
  it('exposes parsed defaults when the URL has no parameters', () => {
    const { result } = renderHook(() => useInboxParams());

    expect(result.current.params.page).toBe(1);
    expect(result.current.params.limit).toBe(20);
    expect(result.current.params.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('resets page to 1 when a filter changes', () => {
    mockSearch = 'page=4&q=tran';
    const { result } = renderHook(() => useInboxParams());

    act(() => result.current.setParams({ label: 'SPAM' }));

    const [url, options] = mockReplace.mock.calls[0] as [string, { scroll: boolean }];
    expect(url).toContain('/leads?');
    expect(url).toContain('label=SPAM');
    expect(url).toContain('page=1');
    expect(url).not.toContain('page=4');
    expect(options).toEqual({ scroll: false });
  });

  it('keeps the page when the page itself changes', () => {
    mockSearch = 'page=1';
    const { result } = renderHook(() => useInboxParams());

    act(() => result.current.setParams({ page: 3 }));

    expect(mockReplace.mock.calls[0][0]).toContain('page=3');
  });

  it('clamps limit to 200 when read from the URL', () => {
    mockSearch = 'limit=999';
    const { result } = renderHook(() => useInboxParams());

    expect(result.current.params.limit).toBe(200);
  });
});
