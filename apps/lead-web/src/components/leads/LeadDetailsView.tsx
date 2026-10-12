'use client';

import type { LeadActivityItem, LeadDetails, PagedResult } from '@lead/shared-contracts';
import { PAGINATION } from '@lead/shared-contracts';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';

import { ActivityComposer } from '@/components/leads/ActivityComposer';
import { ActivityTimeline } from '@/components/leads/ActivityTimeline';
import { LeadDetailsCard } from '@/components/leads/LeadDetailsCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadActivities } from '@/hooks/useLeadActivities';
import { isLeadNotFoundError, useLeadDetails } from '@/hooks/useLeadDetails';
import { cn } from '@/lib/utils';

interface LeadDetailsViewProps {
  leadId: string;
  returnTo: string;
}

function toInitialActivityPage(details: LeadDetails): PagedResult<LeadActivityItem> {
  return {
    items: details.activities,
    page: 1,
    limit: PAGINATION.ACTIVITIES_IN_DETAILS,
    total: details.activitiesTotal
  };
}

export function LeadDetailsView({ leadId, returnTo }: LeadDetailsViewProps) {
  const details = useLeadDetails(leadId);
  const activities = useLeadActivities(
    leadId,
    details.data ? toInitialActivityPage(details.data) : undefined
  );

  if (details.isError && isLeadNotFoundError(details.error)) {
    return <NotFoundState returnTo={returnTo} />;
  }

  return (
    <div className="space-y-6">
      <BackToInboxLink returnTo={returnTo} />
      {details.isSuccess ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <LeadDetailsCard details={details.data} />
          <div className="space-y-6">
            <ActivityComposer leadId={leadId} />
            {activities.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                {activities.isError ? (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center justify-between gap-3">
                      <span>Could not load the activity history.</span>
                      <Button variant="outline" size="sm" onClick={() => void activities.refetch()}>
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                <ActivityTimeline
                  activities={activities.data?.pages.flatMap((page) => page.items) ?? []}
                  hasNextPage={activities.hasNextPage}
                  isFetchingNextPage={activities.isFetchingNextPage}
                  onLoadMore={() => void activities.fetchNextPage()}
                />
              </>
            )}
          </div>
        </div>
      ) : details.isError ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Could not load this lead.</span>
            <Button variant="outline" size="sm" onClick={() => void details.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <LoadingState />
      )}
    </div>
  );
}

function BackToInboxLink({ returnTo }: { returnTo: string }) {
  return (
    <Link
      href={returnTo as Route}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'sm' }),
        'w-fit -ml-2.5 focus-visible:ring-3 focus-visible:ring-ring/50'
      )}
    >
      <ArrowLeft aria-hidden="true" />
      Back to inbox
    </Link>
  );
}

function NotFoundState({ returnTo }: { returnTo: string }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-8 text-center">
        <h2 className="text-lg font-semibold">Lead not found</h2>
        <p className="text-sm text-muted-foreground">
          This lead does not exist or is not available to you.
        </p>
        <div className="flex justify-center">
          <Link href={returnTo as Route} className={buttonVariants({ variant: 'outline' })}>
            Back to inbox
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-busy="true" className="grid items-start gap-6 lg:grid-cols-2">
      <span className="sr-only">Loading lead details</span>
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
