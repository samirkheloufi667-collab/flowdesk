'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, ErrorNote, Field, Input } from '@/components/ui/primitives';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const DEMO = { email: 'demo@flowdesk.dev', password: 'demo1234' };

function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const demo = params.get('demo') === '1';

  const [email, setEmail] = useState(demo ? DEMO.email : '');
  const [password, setPassword] = useState(demo ? DEMO.password : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app');
  }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/app');
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="E-mail" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending} className="mt-1 w-full">
        Se connecter
      </Button>
      <button
        type="button"
        onClick={() => {
          setEmail(DEMO.email);
          setPassword(DEMO.password);
        }}
        className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
      >
        Remplir avec le compte de démonstration
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connectez-vous à votre espace FlowDesk."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-medium text-fg hover:text-accent-strong">
            Créer un compte
          </Link>
        </>
      }
    >
      {/* useSearchParams exige une frontière Suspense avec le rendu statique de Next.js. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
