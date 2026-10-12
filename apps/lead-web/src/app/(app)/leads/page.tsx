import { Suspense } from 'react';

import { InboxView } from '@/components/leads/InboxView';

export default function LeadsInboxPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="h-64 rounded-md border bg-background" />}>
      <InboxView />
    </Suspense>
  );
}
