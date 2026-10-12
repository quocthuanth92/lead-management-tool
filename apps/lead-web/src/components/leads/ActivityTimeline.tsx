import type { ActivityType, LeadActivityItem } from '@lead/shared-contracts';
import { ACTIVITY_TYPES } from '@lead/shared-contracts';
import { CircleEllipsis, Mail, MessageSquare, Phone, StickyNote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

import { Button } from '@/components/ui/button';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/lib/format/relative-time';
import { ACTIVITY_TYPE_TEXT } from '@/lib/leads/presentation';

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  SMS: MessageSquare,
  NOTE: StickyNote,
  OTHER: CircleEllipsis
};

function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

interface ActivityTimelineProps {
  activities: LeadActivityItem[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore: () => void;
}

export function ActivityTimeline({
  activities,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore
}: ActivityTimelineProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-xl border bg-card p-4">
      <h2 id={headingId} className="text-sm font-semibold">
        Activity
      </h2>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="space-y-3">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ol>
      )}
      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
        >
          Load more
        </Button>
      ) : null}
    </section>
  );
}

function ActivityItem({ activity }: { activity: LeadActivityItem }) {
  const known = isActivityType(activity.type);
  const Icon = known ? ACTIVITY_ICONS[activity.type as ActivityType] : CircleEllipsis;
  const typeText = known ? ACTIVITY_TYPE_TEXT[activity.type as ActivityType] : activity.type;

  return (
    <li className="flex gap-3 rounded-lg border p-3">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2">
            <span className="font-medium text-foreground">{typeText}</span>
            <span>{activity.authorName}</span>
          </div>
          <time dateTime={activity.createdAt} title={formatAbsoluteDateTime(activity.createdAt)}>
            {formatRelativeTime(activity.createdAt)}
          </time>
        </div>
        <p className="text-sm break-words whitespace-pre-wrap">{activity.content}</p>
      </div>
    </li>
  );
}
