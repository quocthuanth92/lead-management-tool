import Link from 'next/link';
import type { ReactNode } from 'react';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { getSessionProfile } from '@/lib/server/session';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3">
          <Link href="/leads" className="font-semibold">
            Lead Management
          </Link>
          <div className="flex items-center gap-3">
            {profile ? (
              <span className="text-sm text-muted-foreground">{profile.fullName}</span>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-6">{children}</main>
    </div>
  );
}
