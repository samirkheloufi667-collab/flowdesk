'use client';

import { ArrowRight, KanbanSquare, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import Aurora from '@/components/reactbits/Aurora';
import ShinyText from '@/components/reactbits/ShinyText';
import SplitText from '@/components/reactbits/SplitText';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import { useAuth } from '@/lib/auth';

const FEATURES = [
  {
    icon: KanbanSquare,
    title: 'Tableaux Kanban',
    text: 'Glissez vos tâches d’une colonne à l’autre. Priorités, échéances et responsables visibles d’un coup d’œil.',
  },
  {
    icon: Users,
    title: 'Équipes et ressources',
    text: 'Planifiez le temps de chacun. FlowDesk refuse une réservation qui dépasserait la capacité d’une personne.',
  },
  {
    icon: ShieldCheck,
    title: 'Rôles et permissions',
    text: 'Propriétaire, admin, membre, lecteur : chacun voit et modifie exactement ce que son rôle autorise.',
  },
  {
    icon: LayoutDashboard,
    title: 'Tableau de bord',
    text: 'Avancement, retards, charge des ressources — recalculé à chaque changement, mis en cache le reste du temps.',
  },
];

export default function LandingPage() {
  const { status } = useAuth();
  const signedIn = status === 'authenticated';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] opacity-70">
        <Aurora colorStops={['#3b2fbf', '#7c6cff', '#3ddbc8']} amplitude={1.1} blend={0.55} speed={0.6} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[360px] h-[260px] bg-gradient-to-b from-transparent to-ink" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <nav className="flex items-center justify-between py-5">
          <Brand />
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link href="/app" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">
                Ouvrir mon espace <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="inline-flex h-9 items-center rounded-lg px-3 text-sm text-muted hover:text-fg">
                  Connexion
                </Link>
                <Link href="/register" className="inline-flex h-9 items-center rounded-lg bg-fg px-4 text-sm font-medium text-ink hover:bg-white">
                  Créer un compte
                </Link>
              </>
            )}
          </div>
        </nav>

        <section className="flex flex-col items-center pb-20 pt-16 text-center sm:pt-24">
          <span className="rounded-full border border-line bg-surface/60 px-3 py-1 text-xs backdrop-blur">
            <ShinyText text="Projets · Tâches · Équipes · Ressources" speed={3} color="#8a91a6" shineColor="#e9ebf2" />
          </span>

          <SplitText
            text="Toute votre équipe, sur un seul flux."
            tag="h1"
            className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
            splitType="words"
            delay={60}
            duration={0.9}
            from={{ opacity: 0, y: 28 }}
            to={{ opacity: 1, y: 0 }}
          />

          <p className="mt-6 max-w-xl text-base text-muted sm:text-lg">
            FlowDesk centralise la gestion de vos projets, de vos tâches, de vos équipes et de leur
            charge de travail — avec les permissions qu’exige une vraie organisation.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href={signedIn ? '/app' : '/register'}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-medium text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent-strong"
            >
              {signedIn ? 'Ouvrir mon espace' : 'Commencer gratuitement'} <ArrowRight className="size-4" />
            </Link>
            {!signedIn && (
              <Link
                href="/login?demo=1"
                className="inline-flex h-11 items-center rounded-xl border border-line bg-surface/70 px-6 text-sm font-medium backdrop-blur transition-colors hover:border-line-strong"
              >
                Essayer la démo
              </Link>
            )}
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <SpotlightCard
              key={title}
              className="!rounded-2xl !border-line !bg-surface !p-6"
              spotlightColor="rgba(124, 108, 255, 0.18)"
            >
              <Icon className="size-5 text-accent-strong" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </SpotlightCard>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-xs text-faint">
          <span>FlowDesk — projet de Samir Kheloufi</span>
          <span className="font-mono">Next.js · NestJS · PostgreSQL · Prisma · Redis</span>
        </footer>
      </div>
    </div>
  );
}
