'use client';

import { useRef } from 'react';
import { Brand } from './brand';
import { gsap, prefersReducedMotion, useGSAP } from './motion/gsap';
import { RevealText } from './motion/RevealText';

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Cadre commun aux pages de connexion et d'inscription : une page de garde à
 * gauche (grand titre, filets qui se tracent), le formulaire à droite.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const cover = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-rule]', { scaleX: 0, transformOrigin: 'left', duration: 1.4, stagger: 0.12, ease: 'expo.inOut' });
      gsap.from('[data-fade]', { opacity: 0, y: 12, duration: 1, delay: 0.5, stagger: 0.08 });
    },
    { scope: cover },
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-12">
      <div ref={cover} className="relative flex flex-col border-ink px-5 py-6 sm:px-10 lg:col-span-7 lg:border-r lg:py-8">
        <div className="flex items-baseline justify-between">
          <Brand />
          <span data-fade className="hidden font-mono text-[11px] tracking-[0.1em] text-muted capitalize sm:inline">
            {today.format(new Date())}
          </span>
        </div>
        <span data-rule className="mt-5 block h-px w-full bg-ink" />
        <span data-rule className="mt-[3px] block h-px w-full bg-ink" />

        <div className="flex flex-1 flex-col justify-end py-12 lg:py-16">
          <p data-fade className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">
            Projets · tâches · équipes · ressources
          </p>
          <RevealText as="h1" className="mt-5 max-w-3xl font-serif text-6xl leading-[0.9] tracking-[-0.02em] sm:text-7xl lg:text-[7.5rem]">
            {title}
          </RevealText>
          <p data-fade className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
            {subtitle}
          </p>
        </div>

        {aside && (
          <div data-fade className="hidden lg:block">
            {aside}
          </div>
        )}
      </div>

      <main className="flex flex-col justify-center px-5 pb-16 sm:px-10 lg:col-span-5 lg:px-14 lg:py-16">
        <div className="w-full max-w-md">
          {children}
          <div className="mt-10 border-t border-rule pt-5 text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}
