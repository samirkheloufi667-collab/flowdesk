'use client';

import { useRef } from 'react';
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/lib/format';
import type { Priority, TaskStatus } from '@/lib/types';
import { gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';
import { Badge } from '../ui/primitives';

interface DemoCard {
  title: string;
  priority: Priority;
  who: string;
}

const COLUMNS: Record<TaskStatus, DemoCard[]> = {
  TODO: [
    { title: 'Rédiger le brief client', priority: 'HIGH', who: 'LM' },
    { title: 'Choisir la typographie', priority: 'MEDIUM', who: 'SR' },
    { title: 'Plan du site', priority: 'LOW', who: 'HL' },
  ],
  IN_PROGRESS: [
    { title: 'Maquettes de l’accueil', priority: 'URGENT', who: 'SR' },
    { title: 'Audit d’accessibilité', priority: 'MEDIUM', who: 'KB' },
  ],
  REVIEW: [{ title: 'Textes de la page tarifs', priority: 'HIGH', who: 'LM' }],
  DONE: [
    { title: 'Atelier de lancement', priority: 'MEDIUM', who: 'KB' },
    { title: 'Inventaire des contenus', priority: 'LOW', who: 'HL' },
  ],
};

/** La carte qui traverse le tableau à la fin de l'histoire : de « En cours » à « Terminé ». */
const TRAVELER: DemoCard = { title: 'Intégration du menu', priority: 'HIGH', who: 'HL' };

const STEPS = [
  { title: 'Les tâches arrivent en vrac.', text: 'Un brief, une maquette, un audit : tout ce que l’équipe doit faire, sans ordre.' },
  { title: 'Chacune trouve sa colonne.', text: 'À faire, en cours, en revue, terminé. Un glisser-déposer, et la position est enregistrée.' },
  { title: 'Et avance jusqu’au bout.', text: 'Quand une carte passe la dernière colonne, le tableau de bord se met à jour pour toute l’équipe.' },
];

function Card({ card, done }: { card: DemoCard; done?: boolean }) {
  return (
    <div className="relative border border-rule bg-[#fbf9f4] px-3.5 pt-3 pb-2.5">
      {card.priority === 'URGENT' && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-late" />}
      <p className="relative text-[14px] leading-snug">
        {card.title}
        {done !== undefined && <span data-strike aria-hidden className="absolute inset-x-0 top-1/2 h-px origin-left scale-x-0 bg-ink" />}
      </p>
      <div className="mt-2.5 flex items-center justify-between">
        <Badge color={PRIORITY_COLOR[card.priority]}>{PRIORITY_LABEL[card.priority]}</Badge>
        <span className="flex size-[22px] items-center justify-center rounded-full border border-rule-strong bg-paper-2 font-serif text-[10px] italic">{card.who}</span>
      </div>
    </div>
  );
}

/**
 * Une histoire racontée au défilement (GSAP ScrollTrigger, épinglé et
 * « scrubbé ») : les cartes tombent en vrac, se rangent dans leurs colonnes,
 * puis l'une d'elles traverse le tableau jusqu'à « Terminé ».
 * Sur mobile, pas d'épinglage : les cartes entrent simplement à l'écran.
 */
export function BoardStory() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>('[data-card]', el);
      const traveler = el.querySelector<HTMLElement>('[data-traveler]')!;
      const slot = el.querySelector<HTMLElement>('[data-slot]')!;
      const home = el.querySelector<HTMLElement>('[data-home]')!;
      const steps = gsap.utils.toArray<HTMLElement>('[data-step]', el);

      if (prefersReducedMotion()) {
        gsap.set(steps.slice(0, -1), { autoAlpha: 0 });
        gsap.set(traveler.querySelector('[data-strike]'), { scaleX: 1 });
        return;
      }

      const mm = gsap.matchMedia();

      mm.add('(min-width: 1024px)', () => {
        // Écart entre la place finale de la carte voyageuse (« Terminé ») et sa place de départ (« En cours »).
        const dx = () => slot.getBoundingClientRect().left - home.getBoundingClientRect().left;
        const dy = () => slot.getBoundingClientRect().top - home.getBoundingClientRect().top;
        const scatter = (i: number, axis: 'x' | 'y' | 'r') => {
          const seed = Math.sin((i + 1) * (axis === 'x' ? 12.9898 : axis === 'y' ? 78.233 : 37.719)) * 43758.5453;
          const n = seed - Math.floor(seed); // pseudo-aléatoire stable : même désordre à chaque visite
          return axis === 'r' ? (n - 0.5) * 34 : (n - 0.5) * (axis === 'x' ? 520 : 300);
        };

        gsap.set(steps.slice(1), { autoAlpha: 0, y: 30 });
        gsap.set(cards, { autoAlpha: 0, x: (i) => scatter(i, 'x'), y: (i) => scatter(i, 'y') + 80, rotation: (i) => scatter(i, 'r') });
        gsap.set(traveler, { autoAlpha: 0 });
        gsap.set('[data-colhead]', { autoAlpha: 0, y: 12 });

        const tl = gsap.timeline({
          defaults: { ease: 'power3.inOut' },
          scrollTrigger: { trigger: el, start: 'top top', end: '+=2600', pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
        tl.fromTo(traveler, { x: dx, y: dy }, { x: dx, y: dy, duration: 0.01 }, 0)
          .to(cards, { autoAlpha: 1, y: (i) => scatter(i, 'y'), duration: 1, stagger: 0.06, ease: 'power2.out' }, 0)
          .to(traveler, { autoAlpha: 1, duration: 0.5 }, 0.6)
          .to({}, { duration: 0.4 })
          .to(steps[0], { autoAlpha: 0, y: -30, duration: 0.4 })
          .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.2')
          .to('[data-colhead]', { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, '<')
          .to(cards, { x: 0, y: 0, rotation: 0, duration: 1.4, stagger: 0.04, ease: 'expo.inOut' }, '<')
          .to({}, { duration: 0.5 })
          .to(steps[1], { autoAlpha: 0, y: -30, duration: 0.4 })
          .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.2')
          .to(traveler, { rotation: -4, scale: 1.04, duration: 0.3, ease: 'power2.out' }, '<')
          .fromTo(traveler, { x: dx, y: dy }, { x: 0, y: 0, duration: 1.4, ease: 'expo.inOut', immediateRender: false })
          .to(traveler, { rotation: 0, scale: 1, duration: 0.3 }, '-=0.3')
          .to(traveler.querySelector('[data-strike]'), { scaleX: 1, duration: 0.5 })
          .to('[data-count-before]', { yPercent: -100, autoAlpha: 0, duration: 0.3 }, '<')
          .fromTo('[data-count-after]', { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.3 }, '<')
          .to('[data-progress]', { scaleY: 1, duration: tl.duration(), ease: 'none' }, 0)
          .to({}, { duration: 0.6 });
      });

      mm.add('(max-width: 1023px)', () => {
        gsap.set(steps.slice(0, -1), { display: 'none' });
        gsap.set(traveler.querySelector('[data-strike]'), { scaleX: 1 });
        gsap.from(cards, { autoAlpha: 0, y: 40, rotation: (i) => (i % 2 ? 4 : -4), stagger: 0.05, duration: 1, scrollTrigger: { trigger: el, start: 'top 70%', once: true } });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  let index = 0;
  return (
    <section ref={root} className="relative border-t border-ink lg:h-screen" aria-label="Le tableau Kanban, raconté au défilement">
      <div className="mx-auto grid h-full max-w-[1360px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:py-0">
        <div className="relative flex flex-col justify-center lg:col-span-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Chapitre 1 — Le tableau</p>
          <div className="relative mt-6 lg:h-64">
            {STEPS.map((s, i) => (
              <div key={s.title} data-step className="lg:absolute lg:inset-x-0 lg:top-0">
                <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')} / 03</span>
                <h2 className="mt-3 font-serif text-5xl leading-[0.95] xl:text-6xl">{s.title}</h2>
                <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
          <span aria-hidden className="absolute top-1/2 -left-4 hidden h-40 w-px -translate-y-1/2 bg-rule lg:block">
            <span data-progress className="absolute inset-0 origin-top scale-y-0 bg-ink" />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 self-center lg:col-span-8 lg:grid-cols-4">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="flex flex-col">
              <header data-colhead className="mb-4">
                <span className="block h-[2px] w-8" style={{ background: STATUS_COLOR[status] }} />
                <div className="mt-2.5 flex items-baseline gap-2">
                  <h3 className="font-serif text-2xl leading-none">{STATUS_LABEL[status]}</h3>
                  <span className="relative inline-block overflow-hidden font-mono text-[11px] text-muted">
                    {status === 'IN_PROGRESS' || status === 'DONE' ? (
                      <>
                        <span data-count-before className="block">
                          {String(COLUMNS[status].length + (status === 'IN_PROGRESS' ? 1 : 0)).padStart(2, '0')}
                        </span>
                        <span data-count-after className="absolute inset-0 block opacity-0">
                          {String(COLUMNS[status].length + (status === 'DONE' ? 1 : 0)).padStart(2, '0')}
                        </span>
                      </>
                    ) : (
                      String(COLUMNS[status].length).padStart(2, '0')
                    )}
                  </span>
                </div>
              </header>
              <div className="flex flex-col gap-2.5">
                {COLUMNS[status].map((card) => (
                  <div key={card.title} data-card style={{ zIndex: 20 - index++ }} className="relative">
                    <Card card={card} />
                  </div>
                ))}
                {status === 'IN_PROGRESS' && <div data-slot aria-hidden className="hidden h-[74px] lg:block" />}
                {status === 'DONE' && (
                  <div data-home className="relative">
                    <div data-traveler className="relative z-30 will-change-transform">
                      <Card card={TRAVELER} done />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
