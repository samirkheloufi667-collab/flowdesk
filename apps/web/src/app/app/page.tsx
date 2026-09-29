'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, Database, FolderKanban, ListTodo, Zap } from 'lucide-react';
import Link from 'next/link';
import CountUp from '@/components/reactbits/CountUp';
import { Avatar, Badge, ErrorNote, PageHeader, Progress, Spinner } from '@/components/ui/primitives';
import { useAuth } from '@/lib/auth';
import { dueLabel, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/lib/format';
import type { Dashboard } from '@/lib/types';
import { useApi } from '@/lib/use-api';

function Stat({
  label,
  value,
  icon: Icon,
  tone = 'default',
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'danger' | 'accent';
  suffix?: string;
}) {
  const toneClass = tone === 'danger' ? 'text-danger' : tone === 'accent' ? 'text-accent-strong' : 'text-fg';
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-[13px]">{label}</span>
        <Icon className="size-4" />
      </div>
      <p className={`mt-3 font-mono text-3xl font-medium tabular-nums tracking-tight ${toneClass}`}>
        <CountUp to={value} duration={1.2} separator=" " />
        {suffix}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { me, workspace } = useAuth();
  const { data, error, loading } = useApi<Dashboard>(workspace ? `/workspaces/${workspace.id}/dashboard` : null);
  const firstName = me?.name.split(' ')[0];

  if (!workspace) return <Spinner />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Bonjour ${firstName ?? ''}`}
        subtitle={`Voici où en est ${workspace.name} aujourd’hui.`}
        actions={
          data && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 font-mono text-[11px] text-muted"
              title="Le tableau de bord est mis en cache 60 secondes et invalidé à chaque modification."
            >
              <Database className="size-3" />
              {data.cache.backend === 'redis' ? 'Redis' : 'Mémoire'} · {data.cache.hit ? 'depuis le cache' : 'recalculé'}
            </span>
          )
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      {loading && !data && <Spinner />}

      {data && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Projets actifs" value={data.projects.byStatus.ACTIVE} icon={FolderKanban} />
            <Stat
              label="Tâches ouvertes"
              value={data.tasks.total - data.tasks.byStatus.DONE}
              icon={ListTodo}
            />
            <Stat label="En retard" value={data.tasks.overdue} icon={AlertTriangle} tone={data.tasks.overdue ? 'danger' : 'default'} />
            <Stat label="Assignées à moi" value={data.myOpenTasks} icon={Zap} tone="accent" />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-line bg-surface p-6 lg:col-span-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">Répartition des tâches</h2>
                <span className="text-sm text-muted">
                  <span className="font-mono text-fg">{data.tasks.completionRate} %</span> terminées
                </span>
              </div>

              {data.tasks.total === 0 ? (
                <p className="mt-6 text-sm text-muted">Aucune tâche pour l’instant.</p>
              ) : (
                <>
                  <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-surface-3">
                    {STATUS_ORDER.map((s) => {
                      const n = data.tasks.byStatus[s];
                      if (!n) return null;
                      return (
                        <div
                          key={s}
                          style={{ width: `${(100 * n) / data.tasks.total}%`, background: STATUS_COLOR[s] }}
                          title={`${STATUS_LABEL[s]} : ${n}`}
                        />
                      );
                    })}
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STATUS_ORDER.map((s) => (
                      <div key={s} className="flex items-center gap-2.5">
                        <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[s] }} />
                        <dt className="text-sm text-muted">{STATUS_LABEL[s]}</dt>
                        <dd className="ml-auto font-mono text-sm tabular-nums">{data.tasks.byStatus[s]}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-surface p-6">
              <h2 className="font-semibold">Charge des ressources</h2>
              <p className="mt-1 text-sm text-muted">Occupation moyenne aujourd’hui</p>
              <p className="mt-5 font-mono text-4xl font-medium tabular-nums">
                <CountUp to={data.resources.averageUtilization} duration={1.2} /> %
              </p>
              <div className="mt-4">
                <Progress
                  value={data.resources.averageUtilization}
                  color={data.resources.averageUtilization > 90 ? 'var(--color-warn)' : 'var(--color-teal)'}
                />
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                {data.resources.overbooked ? (
                  <>
                    <AlertTriangle className="size-4 text-danger" />
                    {data.resources.overbooked} ressource(s) surréservée(s)
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-teal" />
                    Aucune surréservation sur {data.resources.total} ressources
                  </>
                )}
              </p>
              <Link href="/app/resources" className="mt-5 inline-block text-sm text-accent-strong hover:underline">
                Voir le planning →
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center gap-2 border-b border-line px-6 py-4">
              <CalendarClock className="size-4 text-muted" />
              <h2 className="font-semibold">Prochaines échéances</h2>
            </div>
            {data.upcoming.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted">Aucune tâche datée en attente.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.upcoming.map((task) => {
                  const due = dueLabel(task.dueDate);
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/app/projects/${task.project.id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5 transition-colors hover:bg-surface-2/50"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ background: task.project.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <p className="truncate text-xs text-muted">{task.project.name}</p>
                        </div>
                        <Badge color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
                        {due && (
                          <span className={`w-28 text-right text-xs ${due.late ? 'font-medium text-danger' : 'text-muted'}`}>
                            {due.text}
                          </span>
                        )}
                        {task.assignee ? <Avatar name={task.assignee.name} size={24} /> : <span className="size-6" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
