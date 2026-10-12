import type { LeadListItem } from '@lead/shared-contracts';
import type { ReactNode } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import { LeadRow } from './LeadRow';

interface LeadTableProps {
  leads: LeadListItem[];
  hrefFor: (leadId: string) => string;
  emptyMessage: ReactNode;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function LeadTable({ leads, hrefFor, emptyMessage, errorMessage, onRetry }: LeadTableProps) {
  if (errorMessage) {
    return (
      <Alert variant="destructive" role="alert" className="flex flex-col gap-3">
        <AlertDescription>{errorMessage}</AlertDescription>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : null}
      </Alert>
    );
  }

  if (leads.length === 0) {
    return (
      <div
        role="status"
        className="rounded-md border border-dashed bg-background p-8 text-center text-sm text-muted-foreground"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul role="list" aria-label="Leads" className="space-y-2">
      {leads.map((lead) => (
        <LeadRow key={lead.id} lead={lead} href={hrefFor(lead.id)} />
      ))}
    </ul>
  );
}
