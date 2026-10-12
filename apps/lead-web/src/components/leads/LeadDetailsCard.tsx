import type { LeadDetails, LeadLabel } from '@lead/shared-contracts';
import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { formatAbsoluteDateTime } from '@/lib/format/relative-time';
import { SOURCE_TEXT } from '@/lib/leads/presentation';

import { isLeadLabel, LabelSelect } from './LabelSelect';

const NOT_PROVIDED = 'Not provided';

function sourceText(source: string): string {
  return Object.hasOwn(SOURCE_TEXT, source)
    ? SOURCE_TEXT[source as keyof typeof SOURCE_TEXT]
    : source;
}

interface LeadDetailsCardProps {
  details: LeadDetails;
}

export function LeadDetailsCard({ details }: LeadDetailsCardProps) {
  // The API only returns known labels; the fallback keeps the select on a valid option.
  const label: LeadLabel = isLeadLabel(details.label) ? details.label : 'UNLABELED';

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="min-w-0 text-lg font-semibold break-words">{details.customerName}</h2>
          <LabelSelect leadId={details.id} label={label} />
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field term="Phone">{details.phone}</Field>
          <Field term="Email">{details.email || NOT_PROVIDED}</Field>
          <Field term="Source">{sourceText(details.source)}</Field>
          <Field term="Created">{formatAbsoluteDateTime(details.createdAt)}</Field>
          <Field term="Last update">{formatAbsoluteDateTime(details.lastUpdate)}</Field>
          <Field term="Message" className="sm:col-span-2">
            <p className="whitespace-pre-wrap">{details.message}</p>
          </Field>
        </dl>
      </CardContent>
    </Card>
  );
}

function Field({
  term,
  className,
  children
}: {
  term: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{term}</dt>
      <dd className="mt-1 text-sm break-words">{children}</dd>
    </div>
  );
}
