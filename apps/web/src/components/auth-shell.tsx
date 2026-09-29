'use client';

import { Brand } from './brand';
import Aurora from './reactbits/Aurora';

/** Cadre commun aux pages de connexion et d'inscription. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60">
        <Aurora colorStops={['#3b2fbf', '#7c6cff', '#3ddbc8']} amplitude={0.9} blend={0.6} speed={0.5} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[220px] h-[220px] bg-gradient-to-b from-transparent to-ink" />

      <div className="relative px-4 py-5 sm:px-6">
        <Brand />
      </div>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {children}
          </div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}
