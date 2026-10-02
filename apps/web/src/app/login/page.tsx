'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, cx, ErrorNote, Field, Input } from '@/components/ui/primitives';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** Comptes du jeu de démonstration (mot de passe commun, publié dans le README). */
const DEMO_PASSWORD = 'demo1234';
const DEMO_ACCOUNTS = [
  { email: 'demo@flowdesk.dev', name: 'Léa Martin', role: 'Propriétaire', note: 'tous les droits' },
  { email: 'sofia@flowdesk.dev', name: 'Sofia Rossi', role: 'Membre', note: 'modifie les tâches' },
  { email: 'client@flowdesk.dev', name: 'Claire Dubois', role: 'Lecteur', note: 'consulte seulement' },
];

function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const demo = params.get('demo') === '1';

  const [email, setEmail] = useState(demo ? DEMO_ACCOUNTS[0].email : '');
  const [password, setPassword] = useState(demo ? DEMO_PASSWORD : '');
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
    <form onSubmit={submit} className="flex flex-col gap-7">
      <p className="font-serif text-3xl">Connexion</p>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="E-mail" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" loading={pending} className="w-full">
        Se connecter
      </Button>

      <div className="mt-4">
        <p className="border-b border-ink pb-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Essayer avec un compte de démonstration</p>
        <ul>
          {DEMO_ACCOUNTS.map((a) => {
            const selected = email === a.email && password === DEMO_PASSWORD;
            return (
              <li key={a.email} className="border-b border-rule">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                  }}
                  className="group flex w-full items-baseline gap-4 py-3 text-left"
                >
                  <span className={cx('font-serif text-xl transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1.5', selected ? 'text-accent italic' : 'text-ink')}>
                    {a.name}
                  </span>
                  <span className="ml-auto font-mono text-[11px] tracking-[0.08em] text-muted uppercase">{a.role}</span>
                  <span className="hidden w-32 text-right text-xs text-faint sm:inline">{a.note}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Bon retour."
      subtitle="Votre espace vous attend là où vous l’avez laissé : tâches ouvertes, échéances, réservations."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/register" className="ink-link text-ink">
            Créer un espace
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
