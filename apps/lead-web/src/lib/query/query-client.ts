'use client';

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from '../api/client';

function handleGlobalError(error: unknown): void {
  if (error instanceof ApiError && error.status === 401 && typeof window !== 'undefined') {
    void fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      window.location.assign('/login');
    });
  }
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobalError }),
  mutationCache: new MutationCache({ onError: handleGlobalError }),
  defaultOptions: {
    queries: { retry: shouldRetry }
  }
});
