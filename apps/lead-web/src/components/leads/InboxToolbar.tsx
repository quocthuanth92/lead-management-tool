'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { LIMITS } from '@lead/shared-contracts';
import { DateRangeFilter } from './DateRangeFilter';
import { LabelFilter } from './LabelFilter';
import type { InboxParams } from '@/lib/leads/inbox-params';

const SEARCH_DEBOUNCE_MS = 300;

interface InboxToolbarProps {
  params: InboxParams;
  onChange: (patch: Partial<InboxParams>) => void;
}

export function InboxToolbar({ params, onChange }: InboxToolbarProps) {
  const searchId = useId();
  const [draftQ, setDraftQ] = useState(params.q);
  const debouncedQ = useDebounce(draftQ, SEARCH_DEBOUNCE_MS);
  const committedQ = useRef(params.q);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (params.q !== committedQ.current) {
      committedQ.current = params.q;
      setDraftQ(params.q);
    }
  }, [params.q]);

  useEffect(() => {
    const term = debouncedQ.trim();
    if (term.length === 1 || term === committedQ.current) {
      return;
    }
    committedQ.current = term;
    onChangeRef.current({ q: term });
  }, [debouncedQ]);

  const draftLength = draftQ.trim().length;
  const scopeActive = Boolean(params.q || params.label);

  return (
    <section
      aria-label="Search and filters"
      className="space-y-3 rounded-md border bg-background p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1 space-y-1">
          <label htmlFor={searchId} className="block text-xs text-muted-foreground">
            Search leads
          </label>
          <div className="relative">
            <Input
              id={searchId}
              type="search"
              aria-label="Search leads"
              aria-describedby={`${searchId}-hint`}
              placeholder="Search name, email or phone…"
              maxLength={LIMITS.SEARCH_MAX}
              value={draftQ}
              onChange={(event) => setDraftQ(event.target.value)}
              className="pr-9 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {draftQ ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear search"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                onClick={() => setDraftQ('')}
              >
                ×
              </Button>
            ) : null}
          </div>
          <p id={`${searchId}-hint`} aria-live="polite" className="text-xs text-muted-foreground">
            {draftLength === 1 ? 'Type at least 2 characters to search' : ''}
          </p>
        </div>

        <LabelFilter value={params.label} onChange={(label) => onChange({ label })} />

        <DateRangeFilter from={params.from} to={params.to} onChange={(range) => onChange(range)} />
      </div>

      {scopeActive ? (
        <p className="inline-flex rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          Within {params.from} – {params.to}
        </p>
      ) : null}
    </section>
  );
}
