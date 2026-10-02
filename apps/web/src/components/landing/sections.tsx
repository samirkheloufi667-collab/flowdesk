'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from '../motion/gsap';
import { RevealText } from '../motion/RevealText';
import { cx } from '../ui/primitives';

const TICKER = [
  'Sofia a déplacé « Maquettes de l’accueil » vers En revue',
  'Thomas a réservé 20 h sur « Refonte du site »',
  'Hugo a terminé « Intégration du menu »',
  'Léa a créé le projet « Application mobile »',
  'Réservation refusée : Thomas serait à 42 h sur 35',
  'Claire (lectrice) consulte « Campagne de rentrée »',
];

/** Bandeau défilant, comme une dépêche : l'activité d'une équipe fictive. */
export function Ticker() {
  const line = TICKER.map((t) => (
    <span key={t} className="flex shrink-0 items-center gap-6 pr-6">
      <span>{t}</span>
      <span aria-hidden className="inline-block size-1.5 rotate-45 bg-accent" />
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-ink bg-ink py-3 text-paper" aria-hidden>
      <div className="ticker flex w-max font-mono text-[12px] tracking-[0.06em] uppercase">
        {line}
        {line}
      </div>
    </div>
  );
}

/**
 * Chapitre 2 : la règle de surréservation, montrée plutôt qu'expliquée.
 * Deux réservations remplissent la jauge ; une troisième tente de franchir le
 * trait de capacité, rebondit, et le refus du serveur s'affiche.
 */
export function Overbooking() {
  const root = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [played, setPlayed] = useState(false);

  useGSAP(
    () => {
      const t = gsap.timeline({ paused: true, onComplete: () => setPlayed(true) });
      t.set('[data-try]', { scaleX: 0, autoAlpha: 1 })
        .set('[data-refused]', { autoAlpha: 0, y: 10 })
        .fromTo('[data-ok]', { scaleX: 0 }, { scaleX: 1, duration: 1, stagger: 0.35, ease: 'expo.inOut' })
        .fromTo('[data-hours]', { textContent: 0 }, { textContent: 32, duration: 1.35, snap: { textContent: 1 }, ease: 'power2.inOut' }, '<')
        .to('[data-try]', { scaleX: 1, duration: 0.9, ease: 'power2.in' }, '+=0.4')
        .to('[data-gauge]', { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: 'none' })
        .to('[data-try]', { scaleX: 0, duration: 0.7, ease: 'expo.out' })
        .to('[data-refused]', { autoAlpha: 1, y: 0, duration: 0.6 }, '<0.1');
      tl.current = t;
      if (prefersReducedMotion()) {
        t.progress(1);
        return;
      }
      ScrollTrigger.create({ trigger: root.current, start: 'top 60%', once: true, onEnter: () => t.play() });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="border-t border-ink">
      <div className="mx-auto grid max-w-[1360px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-36">
        <div className="lg:col-span-5">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Chapitre 2 — Les ressources</p>
          <RevealText as="h2" onScroll className="mt-6 font-serif text-5xl leading-[0.95] sm:text-6xl">
            Personne n’est réservé à 120 %.
          </RevealText>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted">
            Chaque personne, salle ou machine a une capacité. Si une réservation la dépasse, même un seul jour, le serveur la refuse et dit pourquoi. La règle vit dans l’API, pas dans l’interface.
          </p>
        </div>

        <div className="self-end lg:col-span-7">
          <div className="flex items-baseline justify-between">
            <p className="font-serif text-3xl">Thomas Garnier</p>
            <p className="font-mono text-[12px] text-muted">
              <span data-hours>0</span> h / 35 h par semaine
            </p>
          </div>
          <div data-gauge className="relative mt-8 h-14">
            <div className="absolute inset-0 flex gap-[2px]">
              <div data-ok className="h-full origin-left bg-accent" style={{ width: `${(20 / 45) * 100}%` }} />
              <div data-ok className="h-full origin-left bg-wait" style={{ width: `${(12 / 45) * 100}%` }} />
              <div
                data-try
                className="h-full origin-left scale-x-0 border border-late"
                style={{
                  width: `${(10 / 45) * 100}%`,
                  backgroundImage: 'repeating-linear-gradient(135deg, var(--color-late) 0 2px, transparent 2px 7px)',
                }}
              />
            </div>
            <div className="absolute -top-7 -bottom-3 w-px bg-ink" style={{ left: `${(35 / 45) * 100}%` }}>
              <span className="absolute top-0 left-2 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap uppercase">capacité 35 h</span>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div className="border-t border-rule pt-2">
              <dt className="flex items-center gap-2 text-muted">
                <span className="inline-block size-2 bg-accent" /> Refonte du site
              </dt>
              <dd className="font-mono">20 h</dd>
            </div>
            <div className="border-t border-rule pt-2">
              <dt className="flex items-center gap-2 text-muted">
                <span className="inline-block size-2 bg-wait" /> Application mobile
              </dt>
              <dd className="font-mono">12 h</dd>
            </div>
            <div className="border-t border-late pt-2">
              <dt className="flex items-center gap-2 text-late">
                <span className="inline-block size-2 border border-late" /> Campagne
              </dt>
              <dd className="font-mono text-late">+ 10 h ?</dd>
            </div>
          </dl>
          <div data-refused className="mt-10 border-l-2 border-late pl-4">
            <p className="font-mono text-[11px] tracking-[0.12em] text-late uppercase">409 · Conflit</p>
            <p className="mt-1 font-serif text-2xl leading-snug">Thomas serait à 42 h sur 35 du 6 au 10 octobre. Réservation refusée.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlayed(false);
              tl.current?.restart();
            }}
            className={cx('ink-link mt-6 text-sm text-muted transition-opacity', played ? 'opacity-100' : 'pointer-events-none opacity-0')}
          >
            Rejouer
          </button>
        </div>
      </div>
    </section>
  );
}

const ROLES = [
  { name: 'Propriétaire', text: 'Tous les droits, y compris attribuer les rôles et supprimer l’espace.' },
  { name: 'Admin', text: 'Gère projets, équipes, ressources et membres.' },
  { name: 'Membre', text: 'Crée, déplace et termine les tâches des projets.' },
  { name: 'Lecteur', text: 'Consulte tout, ne modifie rien. Pour un client, par exemple.' },
];

/** Chapitre 3 : quatre rôles, quatre lignes. Au survol, l'encre remplit la ligne. */
export function Roles() {
  return (
    <section className="border-t border-ink">
      <div className="mx-auto max-w-[1360px] px-5 py-24 sm:px-8 lg:py-36">
        <div className="grid gap-6 lg:grid-cols-12">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase lg:col-span-4">Chapitre 3 — Les rôles</p>
          <RevealText as="h2" onScroll className="font-serif text-5xl leading-[0.95] sm:text-6xl lg:col-span-8">
            Chacun voit ce qu’il doit voir. Le serveur y veille.
          </RevealText>
        </div>
        <ol className="mt-16 border-t border-ink">
          {ROLES.map((r, i) => (
            <li key={r.name} className="group relative isolate overflow-hidden border-b border-ink">
              <span aria-hidden className="absolute inset-0 -z-10 origin-bottom scale-y-0 bg-ink transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-y-100" />
              <div className="grid items-baseline gap-x-8 gap-y-2 py-6 transition-colors duration-500 group-hover:text-paper sm:grid-cols-[4rem_1fr_minmax(0,22rem)] lg:py-8">
                <span className="font-mono text-xs text-faint transition-colors group-hover:text-paper/60">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-serif text-6xl leading-none transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-4 group-hover:italic sm:text-7xl lg:text-8xl">
                  {r.name}
                </span>
                <span className="text-[15px] leading-relaxed text-muted transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:text-paper/80 sm:translate-x-6 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
                  {r.text}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const COLOPHON = [
  { label: 'Interface', value: 'Next.js 15 (export statique), React 19, Tailwind CSS 4, GSAP, Lenis, Motion' },
  { label: 'API', value: 'NestJS 11, Prisma 6, PostgreSQL, Redis pour le cache du tableau de bord' },
  { label: 'Sécurité', value: 'Session JWT en cookie httpOnly, rôles vérifiés côté serveur sur chaque route' },
  { label: 'Qualité', value: 'Tests unitaires et de bout en bout (Jest + Supertest) sur une vraie base PostgreSQL' },
  { label: 'Hébergement', value: 'Une image Docker : l’API sert aussi l’interface. Déployée sur Render.' },
];

/** Colophon : comment c'est fait, à la manière d'un livre. */
export function Colophon() {
  return (
    <section className="border-t border-ink">
      <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Colophon</p>
          <p className="mt-6 font-serif text-4xl leading-tight">
            Conçu et développé par{' '}
            <a href="https://samir-kheloufi.netlify.app" className="ink-link italic" target="_blank" rel="noreferrer">
              Samir Kheloufi
            </a>
            .
          </p>
          <a href="https://github.com/samirkheloufi667-collab/flowdesk" className="ink-link mt-6 inline-block text-sm text-muted hover:text-ink" target="_blank" rel="noreferrer">
            Lire le code source →
          </a>
        </div>
        <dl className="lg:col-span-8">
          {COLOPHON.map((c) => (
            <div key={c.label} className="grid gap-1 border-b border-rule py-4 first:border-t first:border-ink sm:grid-cols-[10rem_1fr] sm:gap-6">
              <dt className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{c.label}</dt>
              <dd className="text-[15px] leading-relaxed">{c.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Dernier appel : une ligne entière qui se remplit d'outremer au survol. */
export function FinalCall({ signedIn }: { signedIn: boolean }) {
  return (
    <Link href={signedIn ? '/app' : '/login?demo=1'} className="group relative isolate block overflow-hidden border-y border-ink">
      <span aria-hidden className="absolute inset-0 -z-10 origin-left scale-x-0 bg-accent transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
      <span className="mx-auto flex max-w-[1360px] items-baseline justify-between gap-6 px-5 py-12 transition-colors duration-500 group-hover:text-paper sm:px-8 lg:py-16">
        <span className="font-serif text-6xl leading-none sm:text-8xl lg:text-[9rem]">{signedIn ? 'Ouvrir mon espace' : 'Ouvrir la démo'}</span>
        <span className="font-serif text-6xl leading-none transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3 sm:text-8xl">→</span>
      </span>
    </Link>
  );
}
