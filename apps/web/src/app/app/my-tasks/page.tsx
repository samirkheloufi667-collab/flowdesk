'use client';

import { Check, CheckSquare } from 'lucide-react';
import Link from 'next/link';
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mes tâches"
        subtitle={tasks.data ? `${tasks.data.length} tâche(s) ouverte(s) qui vous sont assignées` : undefined}
      />

      {tasks.error && <ErrorNote>{tasks.error}</ErrorNote>}
      {tasks.loading && !tasks.data && <Spinner />}

      {tasks.data?.length === 0 && (
        <EmptyState
          icon={<CheckSquare className="size-5" />}
          title="Rien à faire pour l’instant"
          text="Les tâches qui vous sont assignées apparaîtront ici, classées par urgence."
        />
      )}

      {tasks.data &&
        groupByDue(tasks.data).map((group) => (
          <section key={group.key}>
            <h2 className={cx('mb-2 text-xs font-medium uppercase tracking-[0.08em]', group.key === 'late' ? 'text-danger' : 'text-faint')}>
              {group.label} · {group.tasks.length}
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {group.tasks.map((task) => {
                const due = dueLabel(task.dueDate);
                return (
                  <li key={task.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    {canComplete && (
                      <button
                        type="button"
                        onClick={() => complete(task)}
                        className="group flex size-5 shrink-0 items-center justify-center rounded-md border border-line-strong transition-colors hover:border-teal hover:bg-teal/15"
                        aria-label={`Marquer « ${task.title} » comme terminée`}
                      >
                        <Check className="size-3 text-teal opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                    <Link href={`/app/projects/view?id=${task.projectId}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium hover:text-accent-strong">{task.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                        <span className="size-1.5 rounded-full" style={{ background: task.project?.color }} />
                        {task.project?.name} · {STATUS_LABEL[task.status]}
                      </p>
                    </Link>
                    <Badge color={PRIORITY_COLOR[task.priority]} className="hidden sm:inline-flex">
                      {PRIORITY_LABEL[task.priority]}
                    </Badge>
                    {due && <span className={cx('w-24 text-right text-xs', due.late ? 'font-medium text-danger' : 'text-muted')}>{due.text}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
