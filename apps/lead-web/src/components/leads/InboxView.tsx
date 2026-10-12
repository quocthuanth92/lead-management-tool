'use client';

import type { ReactNode } from 'react';

import { InboxToolbar } from '@/components/leads/InboxToolbar';
import { LeadTable } from '@/components/leads/LeadTable';
import { Pagination } from '@/components/leads/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { useInboxParams } from '@/hooks/useInboxParams';
import { useLeads } from '@/hooks/useLeads';
import { serializeInboxParams } from '@/lib/leads/inbox-params';
import { cn } from '@/lib/utils';

const GENERIC_LOAD_ERROR = 'Could not load leads. Check your connection and try again.';

function errorMessageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : GENERIC_LOAD_ERROR;
}

export function InboxView() {
  const { params, setParams } = useInboxParams();
  const leads = useLeads(params);
  const isFiltered = Boolean(params.q || params.label);
  const returnTo = `/leads?${serializeInboxParams(params)}`;

  const hrefFor = (leadId: string) =>
    `/leads/${encodeURIComponent(leadId)}?returnTo=${encodeURIComponent(returnTo)}`;

  const emptyMessage: ReactNode = isFiltered ? (
    <>
      No leads match.{' '}
      <Button type="button" variant="link" onClick={() => setParams({ q: '', label: '' })}>
        Clear search
      </Button>
    </>
  ) : (
    'No leads in this period. Try a wider date range.'
  );

  return (
    <section aria-labelledby="inbox-title" className="space-y-4">
      <h1 id="inbox-title" className="text-2xl font-semibold">
        Lead Inbox
      </h1>

      <InboxToolbar params={params} onChange={setParams} />

      {leads.isPending ? (
        <div aria-busy="true" aria-label="Loading leads" className="space-y-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div
          className={cn('space-y-4 transition-opacity', leads.isPlaceholderData && 'opacity-60')}
          aria-busy={leads.isFetching}
        >
          <LeadTable
            leads={leads.data?.items ?? []}
            hrefFor={hrefFor}
            emptyMessage={emptyMessage}
            errorMessage={leads.isError ? errorMessageFor(leads.error) : null}
            onRetry={() => void leads.refetch()}
          />
          {leads.data ? (
            <Pagination
              page={leads.data.page}
              limit={leads.data.limit}
              total={leads.data.total}
              onPageChange={(page) => setParams({ page })}
              onLimitChange={(limit) => setParams({ limit })}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
