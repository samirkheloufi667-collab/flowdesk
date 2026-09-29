'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/app-shell';
import { Spinner } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';

/** Zone connectée : sans session, on renvoie vers la page de connexion. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Ouverture de votre espace" />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
