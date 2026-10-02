'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, ErrorNote, Field, Input } from '@/components/ui/primitives';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { register, status } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', workspaceName: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/app');
  }, [status, router]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        workspaceName: form.workspaceName.trim() || undefined,
      });
      router.replace('/app');
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Un nouvel espace."
      subtitle="Un compte, un premier espace de travail dont vous êtes propriétaire. Invitez votre équipe ensuite."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link href="/login" className="ink-link text-ink">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-7">
        <p className="font-serif text-3xl">Inscription</p>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Field label="Nom complet" htmlFor="name">
          <Input id="name" autoComplete="name" required minLength={2} value={form.name} onChange={set('name')} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mot de passe" htmlFor="password" hint="8 caractères minimum.">
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Nom de l’espace" htmlFor="workspace" hint="Facultatif — votre entreprise ou votre équipe.">
          <Input id="workspace" placeholder="Studio Nova" value={form.workspaceName} onChange={set('workspaceName')} />
        </Field>
        <Button type="submit" loading={pending} className="w-full">
          Créer mon espace
        </Button>
      </form>
    </AuthShell>
  );
}
