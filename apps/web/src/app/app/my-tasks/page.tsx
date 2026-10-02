'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/components/motion/gsap';
import { Stagger } from '@/components/motion/Stagger';
import { Badge, cx, EmptyState, ErrorNote, PageHeader, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, daysUntil, dueLabel, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_LABEL } from '@/lib/format';
import type { Task } from '@/lib/types';
import { useApi } from '@/lib/use-api';

type Group = { key: string; label: string; tasks: Task[] };

/** Regroupe par urgence : c'est l'ordre dans lequel on traite réellement ses tâches. */
function groupByDue(tasks: Task[]): Group[] {
  const groups: Group[] = [
    { key: 'late', label: 'En retard', tasks: [] },
    { key: 'week', label: 'Cette semaine', tasks: [] },
    { key: 'later', label: 'Plus tard', tasks: [] },
    { key: 'none', label: 'Sans échéance', tasks: [] },
  ];
  for (const task of tasks) {
    const days = daysUntil(task.dueDate);
    const index = days === null ? 3 : days < 0 ? 0 : days <= 7 ? 1 : 2;
    groups[index].tasks.push(task);
  }
  return groups.filter((g) => g.tasks.length > 0);
}

/**
 * Une ligne de la liste. Cocher une tâche la raye d'un trait d'encre, puis la
 * ligne se referme : on voit ce qu'on vient d'accomplir avant qu'il disparaisse.
 */
function TaskRow({ task, canComplete, onComplete }: { task: Task; canComplete: boolean; onComplete: (t: Task) => void }) {
  const row = useRef<HTMLLIElement>(null);
  const due = dueLabel(task.dueDate);

  function check() {
    const el = row.current;
    if (!el || prefersReducedMotion()) return onComplete(task);
    gsap
      .timeline({ onComplete: () => onComplete(task) })
      .to(el.querySelector('[data-tick]'), { scale: 1, duration: 0.3, ease: 'back.out(3)' })
      .to(el.querySelector('[data-strike]'), { scaleX: 1, duration: 0.55, ease: 'expo.inOut' }, '<')
      .to(el, { opacity: 0, x: 24, duration: 0.45, ease: 'power3.in' }, '+=0.25')
      .to(el, { height: 0, paddingTop: 0, paddingBottom: 0, borderWidth: 0, duration: 0.45, ease: 'expo.inOut' });
  }

  return (
    <li ref={row} data-reveal className="flex items-center gap-5 overflow-hidden border-b border-rule py-5">
      {canComplete && (
        <button
          type="button"
          onClick={check}
          className="group relative flex size-6 shrink-0 items-center justify-center border border-ink-2 transition-colors hover:border-accent"
          aria-label={`Marquer « ${task.title} » comme terminée`}
        >
          <span data-tick className="block size-3 scale-0 bg-accent transition-transform duration-300 group-hover:scale-50" />
        </button>
      )}
      <Link href={`/app/projects/view?id=${task.projectId}`} className="group min-w-0 flex-1">
        <span className="relative inline-block max-w-full">
          <span className="block truncate font-serif text-2xl leading-tight transition-colors group-hover:text-accent sm:text-[28px]">{task.title}</span>
          <span data-strike aria-hidden className="absolute inset-x-0 top-1/2 h-[2px] origin-left scale-x-0 bg-ink" />
        </span>
        <span className="mt-1.5 flex items-center gap-2 truncate text-sm text-muted">
          <span className="inline-block size-2 rotate-45" style={{ background: task.project?.color }} />
          {task.project?.name} · {STATUS_LABEL[task.status]}
        </span>
      </Link>
      <Badge color={PRIORITY_COLOR[task.priority]} className="hidden sm:inline-flex">
        {PRIORITY_LABEL[task.priority]}
      </Badge>
      {due && <span className={cx('w-28 text-right font-mono text-[12px]', due.late ? 'text-late' : 'text-muted')}>{due.text}</span>}
    </li>
  );
}

export default function MyTasksPage() {
  const { workspace } = useAuth();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;
  const tasks = useApi<Task[]>(base && `${base}/tasks/mine`);

  if (!workspace || !base) return <Spinner />;
  const canComplete = can(workspace.role, 'MEMBER');

  async function complete(task: Task) {
    tasks.setData((list) => list?.filter((t) => t.id !== task.id) ?? null);
    try {
      await api(`${base}/tasks/${task.id}`, { method: 'PATCH', json: { status: 'DONE' } });
      toast('success', `« ${task.title} » terminée`);
    } catch (err) {
      toast('error', errorMessage(err));
      void tasks.reload();
    }
  }

  const count = tasks.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        index="Votre liste"
        title="Mes tâches"
        subtitle={tasks.data ? (count ? `${count} tâche${count > 1 ? 's' : ''} ouverte${count > 1 ? 's' : ''}, classée${count > 1 ? 's' : ''} par urgence. Cochez pour rayer.` : undefined) : undefined}
      />

      {tasks.error && <ErrorNote>{tasks.error}</ErrorNote>}
      {tasks.loading && !tasks.data && <Spinner />}

      {tasks.data?.length === 0 && <EmptyState title="Rien à faire pour l’instant." text="Les tâches qui vous sont assignées apparaîtront ici, classées par urgence." />}

      {tasks.data &&
        groupByDue(tasks.data).map((group) => (
          <section key={group.key} className="grid gap-6 lg:grid-cols-12">
            <h2 className="lg:col-span-3">
              <span className={cx('block font-serif text-4xl italic', group.key === 'late' ? 'text-late' : 'text-ink')}>{group.label}</span>
              <span className="mt-2 block font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                {String(group.tasks.length).padStart(2, '0')} tâche{group.tasks.length > 1 ? 's' : ''}
              </span>
            </h2>
            <Stagger as="ul" watch={group.tasks.length} className="border-t border-ink lg:col-span-9">
              {group.tasks.map((task) => (
                <TaskRow key={task.id} task={task} canComplete={canComplete} onComplete={complete} />
              ))}
            </Stagger>
          </section>
        ))}
    </div>
  );
}
