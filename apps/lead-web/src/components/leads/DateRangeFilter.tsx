'use client';

import { useEffect, useId, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { defaultDateRange, type DateRange } from '@/lib/leads/inbox-params';

interface DateRangeFilterProps {
  from: string;
  to: string;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ from, to, onChange }: DateRangeFilterProps) {
  const fromId = useId();
  const toId = useId();
  const [draft, setDraft] = useState<DateRange>({ from, to });

  useEffect(() => {
    setDraft({ from, to });
  }, [from, to]);

  const orderError = draft.from !== '' && draft.to !== '' && draft.from > draft.to;

  function update(next: DateRange) {
    setDraft(next);
    if (next.from !== '' && next.to !== '' && next.from <= next.to) {
      onChange(next);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label htmlFor={fromId} className="block text-xs text-muted-foreground">
          From
        </label>
        <Input
          id={fromId}
          type="date"
          className="w-40"
          value={draft.from}
          aria-invalid={orderError}
          onChange={(event) => update({ ...draft, from: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={toId} className="block text-xs text-muted-foreground">
          To
        </label>
        <Input
          id={toId}
          type="date"
          className="w-40"
          value={draft.to}
          aria-invalid={orderError}
          onChange={(event) => update({ ...draft, to: event.target.value })}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => update(defaultDateRange())}>
        Last 6 months
      </Button>
      {orderError ? (
        <Alert variant="destructive" role="alert" className="w-full py-2">
          <AlertDescription>Start date must be on or before end date</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
