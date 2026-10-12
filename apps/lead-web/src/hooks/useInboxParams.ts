'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { parseInboxParams, serializeInboxParams, type InboxParams } from '@/lib/leads/inbox-params';
import { toRoute } from '@/lib/navigation';

export function useInboxParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useMemo(
    () => parseInboxParams(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  const setParams = useCallback(
    (patch: Partial<InboxParams>) => {
      const next: InboxParams = { ...params, ...patch };
      if (patch.page === undefined) {
        next.page = 1;
      }
      router.replace(toRoute(`${pathname}?${serializeInboxParams(next)}`), { scroll: false });
    },
    [params, pathname, router]
  );

  return { params, setParams };
}
