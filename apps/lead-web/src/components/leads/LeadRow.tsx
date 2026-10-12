import type { LeadListItem, LeadLabel } from '@lead/shared-contracts';
import Link from 'next/link';

import { LabelBadge } from '@/components/leads/LabelBadge';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/format/relative-time';
import { toRoute } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface LeadRowProps {
  lead: LeadListItem;
  href: string;
}

export function LeadRow({ lead, href }: LeadRowProps) {
  const unread = !lead.hasView;

  return (
    <li>
      <Link
        href={toRoute(href)}
        className="block rounded-md border bg-background px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {unread ? (
              <>
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                <span className="sr-only">Unread</span>
              </>
            ) : null}
            <span className={cn('truncate', unread && 'font-semibold')}>{lead.customerName}</span>
          </div>
          <LabelBadge label={lead.label as LeadLabel} />
        </div>
        <p
          className={cn(
            'mt-1 truncate text-sm text-muted-foreground',
            unread && 'font-medium text-foreground'
          )}
        >
          Phone: {lead.phone}
          {lead.email ? ` · Email: ${lead.email}` : ''}
        </p>
        <p
          className="mt-1 text-xs text-muted-foreground"
          title={formatAbsoluteDateTime(lead.lastUpdate)}
        >
          {formatRelativeTime(lead.lastUpdate)}
        </p>
      </Link>
    </li>
  );
}
