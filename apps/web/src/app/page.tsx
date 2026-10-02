'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Brand } from '@/components/brand';
import { BoardStory } from '@/components/landing/board-story';
import { Colophon, FinalCall, Overbooking, Roles, Ticker } from '@/components/landing/sections';
import { useSmoothScroll } from '@/components/landing/smooth-scroll';
import { gsap, prefersReducedMotion, SplitText, useGSAP } from '@/components/motion/gsap';
import { buttonClass } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Page d'accueil, composée comme la une d'un journal : bandeau, double filet,
 * un titre immense dont les lettres se posent une à une, puis trois chapitres
 * racontés au défilement.
 */
export default function LandingPage() {
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  const hero = useRef<HTMLElement>(null);
  useSmoothScroll();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline();
      tl.from('[data-rule]', { scaleX: 0, transformOrigin: 'left', duration: 1.4, stagger: 0.1, ease: 'expo.inOut' });
      SplitText.create('[data-headline]', {
        type: 'lines,chars',
        mask: 'lines',
        autoSplit: true,
        onSplit(self) {
          return tl.from(self.chars, { yPercent: 110, rotate: 6, duration: 1.2, stagger: 0.018, ease: 'expo.out' }, 0.35);
        },
      });
      tl.from('[data-fade]', { autoAlpha: 0, y: 16, duration: 1, stagger: 0.08 }, 0.9);
      // Au défilement, le titre recule doucement : la une s'efface sous le premier chapitre.
      gsap.to('[data-headline]', {
        yPercent: -12,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: { trigger: hero.current, start: 'top top', end: 'bottom top', scrub: true },
      });
    },
    { scope: hero },
  );

  return (
    <div className="overflow-x-clip">
      <header ref={hero} className="mx-auto flex min-h-[100svh] max-w-[1360px] flex-col px-5 pt-5 sm:px-8">
        <nav className="flex items-baseline justify-between gap-4">
          <Brand />
          <span data-fade className="hidden font-mono text-[11px] tracking-[0.1em] text-muted capitalize md:inline">
            {today.format(new Date())}
          </span>
          <div data-fade className="flex items-center gap-5 text-sm">
            {signedIn ? (
              <Link href="/app" className="ink-link">
                Ouvrir mon espace →
              </Link>
            ) : (
              <>
                <Link href="/login" className="ink-link text-muted hover:text-ink">
                  Connexion
                </Link>
                <Link href="/register" className="ink-link">
                  Créer un espace
                </Link>
              </>
            )}
          </div>
        </nav>
        <span data-rule className="mt-5 block h-px bg-ink" />
        <span data-rule className="mt-[3px] block h-px bg-ink" />
        <div data-fade className="flex justify-between py-2 font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
          <span>Gestion de projets</span>
          <span className="hidden sm:inline">Projets · Tâches · Équipes · Ressources</span>
          <span>Édition de démonstration</span>
        </div>
        <span data-rule className="block h-px bg-ink" />

        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 data-headline className="font-serif text-[17vw] leading-[0.84] tracking-[-0.03em] sm:text-[13vw] xl:text-[11.5rem]">
            Le travail d’équipe, <em className="text-accent">mis en page.</em>
          </h1>
        </div>

        <div className="grid gap-8 border-t border-ink py-8 sm:grid-cols-12">
          <p data-fade className="max-w-md text-lg leading-relaxed text-ink-2 sm:col-span-7">
            FlowDesk réunit les projets, les tâches, les équipes et leur charge de travail dans un seul espace, avec les permissions qu’exige une vraie organisation.
          </p>
          <div data-fade className="flex flex-wrap items-center gap-6 sm:col-span-5 sm:justify-end">
            <Link href={signedIn ? '/app' : '/login?demo=1'} className={buttonClass('primary', 'md', 'h-12 px-7')}>
              {signedIn ? 'Ouvrir mon espace' : 'Essayer la démo'}
            </Link>
            {!signedIn && (
              <Link href="/register" className="ink-link text-[15px]">
                Créer un espace
              </Link>
            )}
          </div>
        </div>
      </header>

      <Ticker />
      <BoardStory />
      <Overbooking />
      <Roles />
      <FinalCall signedIn={signedIn} />
      <Colophon />

      <footer className="mx-auto flex max-w-[1360px] flex-wrap items-baseline justify-between gap-3 px-5 py-8 font-mono text-[11px] tracking-[0.1em] text-faint uppercase sm:px-8">
        <span>© {new Date().getFullYear()} Samir Kheloufi — tous droits réservés</span>
        <span>Personnes et projets fictifs</span>
      </footer>
    </div>
  );
}
