'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleSignOut} disabled={pending}>
      Sign out
    </Button>
  );
}
