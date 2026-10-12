import { sanitizeInternalPath } from '@/lib/auth/route-guard';

import { LoginForm } from './login-form';

interface LoginPageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const nextPath = sanitizeInternalPath(Array.isArray(next) ? next[0] : next, '/leads');

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm"
      >
        <h1 id="login-title" className="mb-1 text-xl font-semibold">
          Sign in
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">Lead Management for salespeople</p>
        <LoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
