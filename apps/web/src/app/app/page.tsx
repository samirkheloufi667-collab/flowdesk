'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Counter } from '@/components/motion/Counter';
import { gsap, prefersReducedMotion, useGSAP } from '@/components/motion/gsap';
import { Stagger } from '@/components/motion/Stagger';
import { Avatar, Badge, cx, ErrorNote, PageHeader, SectionLabel, Spinner } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { daysUntil, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/lib/format';
import type { Dashboard } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit' });
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** La phrase d'ouverture : ce qui compte aujourd'hui, en une ligne. */
function headline(d: Dashboard) {
  const open = d.tasks.total - d.tasks.byStatus.DONE;
  if (open === 0) return 'Toutes les tâches sont terminées. Rare, et mérité.';
  const late = d.tasks.overdue ? `, dont ${d.tasks.overdue} en retard` : '';
  return `${open} tâche${open > 1 ? 's' : ''} ouverte${open > 1 ? 's' : ''}${late}. ${d.myOpenTasks ? `${d.myOpenTasks} vous ${d.myOpenTasks > 1 ? 'attendent' : 'attend'}.` : 'Aucune ne vous est assignée.'}`;
}

/** Barre de répartition : chaque segment s'étire à sa largeur, l'un après l'autre. */
function Distribution({ data }: { data: Dashboard }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-seg]', { scaleX: 0, transformOrigin: 'left', duration: 1.2, stagger: 0.12, ease: 'expo.inOut' });
    },
    { scope: ref, dependencies: [data.tasks.total] },
  );
  return (
    <div ref={ref}>
      <div className="flex h-10 w-full gap-[3px]">
        {STATUS_ORDER.map((s) => {
          const n = data.tasks.byStatus[s];
          if (!n) return null;
          return <div key={s} data-seg style={{ flexGrow: n, background: STATUS_COLOR[s] }} title={`${STATUS_LABEL[s]} : ${n}`} />;
        })}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        {STATUS_ORDER.map((s) => (
          <div key={s} className="flex items-baseline justify-between border-t border-rule pt-2">
            <dt className="flex items-center gap-2 text-sm text-muted">
              <span className="inline-block size-2" style={{ background: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}
            </dt>
            <dd className="font-mono text-sm">{data.tasks.byStatus[s]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BigFigure({ value, label, tone, suffix }: { value: number; label: string; tone?: 'late' | 'accent'; suffix?: string }) {
  return (
    <div className="border-rule py-6 first:pt-0 sm:border-l sm:py-0 sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      <p className={cx('font-serif text-7xl leading-none tracking-tight italic sm:text-8xl', tone === 'late' && value > 0 ? 'text-late' : tone === 'accent' ? 'text-accent' : 'text-ink')}>
        <Counter value={value} suffix={suffix} />
      </p>
      <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { me, workspace } = useAuth();
  const { data, error, loading } = useApi<Dashboard>(workspace ? `/workspaces/${workspace.id}/dashboard` : null);
  const firstName = me?.name.split(' ')[0];

  if (!workspace) return <Spinner />;

  return (
    <div className="flex flex-col gap-14">
      <PageHeader index={`Édition du jour — ${workspace.name}`} title={`Bonjour ${firstName ?? ''}.`} subtitle={data ? headline(data) : undefined} />

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data && <Spinner />}

      {data && (
        <>
          <section className="grid divide-y divide-rule sm:grid-cols-4 sm:divide-y-0">
            <BigFigure value={data.projects.byStatus.ACTIVE} label="Projets actifs" />
            <BigFigure value={data.tasks.total - data.tasks.byStatus.DONE} label="Tâches ouvertes" />
            <BigFigure value={data.tasks.overdue} label="En retard" tone="late" />
            <BigFigure value={data.myOpenTasks} label="Pour vous" tone="accent" />
          </section>

          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
            <section className="lg:col-span-8">
              <SectionLabel aside={`${data.upcoming.length} à venir`}>Échéances</SectionLabel>
              {data.upcoming.length === 0 ? (
                <p className="mt-6 font-serif text-2xl text-muted italic">Aucune tâche datée en attente.</p>
              ) : (
                <Stagger as="ol" watch={data.upcoming.length}>
                  {data.upcoming.map((task) => {
                    const days = daysUntil(task.dueDate);
                    const late = days !== null && days < 0;
                    const date = task.dueDate ? new Date(task.dueDate) : null;
                    return (
                      <li key={task.id} data-reveal className="border-b border-rule">
                        <Link href={`/app/projects/view?id=${task.project.id}`} className="group grid grid-cols-[64px_1fr_auto] items-center gap-x-5 py-4 sm:grid-cols-[72px_1fr_auto_auto]">
                          <span className={cx('text-center leading-none', late ? 'text-late' : 'text-ink')}>
                            <span className="block font-serif text-4xl">{date ? dayFmt.format(date) : '—'}</span>
                            <span className="mt-1 block font-mono text-[10px] tracking-[0.14em] uppercase">{date ? monthFmt.format(date).replace('.', '') : ''}</span>
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[17px] transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-2">{task.title}</span>
                            <span className="mt-1 flex items-center gap-2 text-sm text-muted">
                              <span className="inline-block size-2" style={{ background: task.project.color }} />
                              {task.project.name}
                              {late && <span className="font-mono text-[11px] text-late uppercase">· en retard de {-(days ?? 0)} j</span>}
                            </span>
                          </span>
                          <span className="hidden sm:block">
                            <Badge color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
                          </span>
                          {task.assignee ? <Avatar name={task.assignee.name} size={30} /> : <span className="size-[30px]" />}
                        </Link>
                      </li>
                    );
                  })}
                </Stagger>
              )}
            </section>

            <aside className="flex flex-col gap-12 lg:col-span-4">
              <section>
                <SectionLabel aside={`${data.tasks.completionRate} % terminées`}>Avancement</SectionLabel>
                <div className="mt-5">{data.tasks.total === 0 ? <p className="text-sm text-muted">Aucune tâche pour l’instant.</p> : <Distribution data={data} />}</div>
              </section>

              <section>
                <SectionLabel>Ressources</SectionLabel>
                <p className="mt-5 font-serif text-6xl leading-none italic">
                  <Counter value={data.resources.averageUtilization} suffix=" %" />
                </p>
                <p className="mt-2 text-sm text-muted">d’occupation moyenne aujourd’hui</p>
                <p className={cx('mt-5 border-l-2 pl-3 text-sm', data.resources.overbooked ? 'border-late text-late' : 'border-done text-done')}>
                  {data.resources.overbooked
                    ? `${data.resources.overbooked} ressource(s) surréservée(s).`
                    : `Aucune surréservation sur ${data.resources.total} ressources.`}
                </p>
                <Link href="/app/resources" className="ink-link mt-5 inline-block text-sm">
                  Voir le planning →
                </Link>
              </section>

              <p className="font-mono text-[11px] leading-relaxed text-faint" title="Le tableau de bord est mis en cache 60 secondes et invalidé à chaque modification.">
                Calculé à {timeFmt.format(new Date(data.computedAt))} · {data.cache.hit ? 'servi depuis le cache' : 'recalculé'} ({data.cache.backend === 'redis' ? 'Redis' : 'mémoire'})
              </p>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
