'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { KanbanBoard } from '@/components/kanban';
import { RevealText } from '@/components/motion/RevealText';
import { ProjectForm } from '@/components/project-form';
import { TaskForm } from '@/components/task-form';
import { Modal } from '@/components/ui/modal';
import { Avatar, Badge, Button, ErrorNote, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  can,
  formatFullDate,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_TONE,
  STATUS_LABEL,
} from '@/lib/format';
import type { Member, Project, Task, TaskStatus, Team } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/**
 * Page d'un projet : /app/projects/view?id=…
 * L'identifiant est dans la requête plutôt que dans le chemin : l'interface est
 * exportée en fichiers statiques (servis par l'API), et un chemin dynamique
 * exigerait de connaître tous les projets au moment de la compilation.
 */
export default function ProjectPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProjectView />
    </Suspense>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-rule pt-3">
      <dt className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">{label}</dt>
      <dd className="mt-1.5 text-[15px]">{children}</dd>
    </div>
  );
}

function ProjectView() {
  const id = useSearchParams().get('id') ?? '';
  const { workspace } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;

  const project = useApi<Project>(base && `${base}/projects/${id}`);
  const tasks = useApi<Task[]>(base && `${base}/projects/${id}/tasks`);
  const members = useApi<Member[]>(base && `${base}/members`);
  const teams = useApi<Team[]>(base && `${base}/teams`);

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null);

  if (!workspace || !base) return <Spinner />;
  const canEditTasks = can(workspace.role, 'MEMBER');
  const canManage = can(workspace.role, 'ADMIN');

  /** Déplacement optimiste : l'interface bouge tout de suite, l'API confirme ensuite. */
  async function move(task: Task, status: TaskStatus, position: number) {
    const previous = tasks.data;
    tasks.setData((list) => list?.map((t) => (t.id === task.id ? { ...t, status, position } : t)) ?? null);
    try {
      await api(`${base}/tasks/${task.id}/move`, { method: 'PATCH', json: { status, position } });
      // Le serveur a pu renuméroter la colonne : on resynchronise les positions.
      void tasks.reload();
      if (status !== task.status) toast('success', `« ${task.title} » → ${STATUS_LABEL[status]}`);
    } catch (err) {
      tasks.setData(previous);
      toast('error', errorMessage(err));
    }
  }

  async function deleteProject() {
    try {
      await api(`${base}/projects/${id}`, { method: 'DELETE' });
      toast('success', 'Projet supprimé');
      router.replace('/app/projects');
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  const back = (
    <Link href="/app/projects" className="ink-link font-mono text-[11px] tracking-[0.14em] text-muted uppercase hover:text-ink">
      ← Sommaire des projets
    </Link>
  );

  if (project.error) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <ErrorNote>{project.error}</ErrorNote>
      </div>
    );
  }
  if (!project.data) return <Spinner />;
  const p = project.data;
  const done = tasks.data?.filter((t) => t.status === 'DONE').length ?? p.doneCount ?? 0;
  const total = tasks.data?.length ?? p.taskCount ?? 0;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-12">
      <header className="border-b border-ink pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {back}
          <div className="flex flex-wrap items-center gap-5">
            {canManage && (
              <>
                <button type="button" className="ink-link text-sm text-muted hover:text-ink" onClick={() => setEditing(true)}>
                  Modifier
                </button>
                <button type="button" className="ink-link text-sm text-late" onClick={() => setConfirmDelete(true)}>
                  Supprimer
                </button>
              </>
            )}
            {canEditTasks && (
              <Button size="sm" onClick={() => setNewTaskStatus('TODO')}>
                Nouvelle tâche
              </Button>
            )}
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <span aria-hidden className="mb-6 block h-1.5 w-24" style={{ background: p.color }} />
            <RevealText as="h1" className="font-serif text-6xl leading-[0.92] tracking-[-0.015em] sm:text-7xl lg:text-8xl">
              {p.name}
            </RevealText>
            {p.description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">{p.description}</p>}
          </div>
          <dl className="grid grid-cols-2 content-end gap-x-6 gap-y-5 lg:col-span-4">
            <Meta label="Statut">
              <Badge color={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
            </Meta>
            <Meta label="Équipe">{p.team?.name ?? 'Sans équipe'}</Meta>
            <Meta label="Début">{formatFullDate(p.startDate)}</Meta>
            <Meta label="Échéance">{formatFullDate(p.dueDate)}</Meta>
            <div className="col-span-2 border-t border-rule pt-3">
              <dt className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
                Avancement
                <span>
                  {done}/{total} tâches
                </span>
              </dt>
              <dd className="mt-1 font-serif text-5xl italic">
                {progress}
                <span className="text-2xl not-italic text-muted"> %</span>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {!canEditTasks && <p className="border-l-2 border-ink pl-3 font-serif text-xl italic">Vous consultez ce projet en lecture seule.</p>}

      {tasks.error && <ErrorNote>{tasks.error}</ErrorNote>}
      {tasks.data ? (
        <KanbanBoard tasks={tasks.data} canEdit={canEditTasks} onMove={move} onOpen={setOpenTask} onAdd={(status) => setNewTaskStatus(status)} />
      ) : (
        <Spinner />
      )}

      <Modal open={newTaskStatus !== null} onClose={() => setNewTaskStatus(null)} title="Nouvelle tâche" wide>
        {newTaskStatus && (
          <TaskForm
            workspaceId={workspace.id}
            projectId={id}
            members={members.data ?? []}
            defaultStatus={newTaskStatus}
            onCancel={() => setNewTaskStatus(null)}
            onSaved={(t) => {
              setNewTaskStatus(null);
              toast('success', `Tâche « ${t.title} » créée`);
              void tasks.reload();
            }}
          />
        )}
      </Modal>

      <Modal open={openTask !== null} onClose={() => setOpenTask(null)} title={canEditTasks ? 'Modifier la tâche' : 'Tâche'} wide>
        {openTask &&
          (canEditTasks ? (
            <TaskForm
              workspaceId={workspace.id}
              projectId={id}
              task={openTask}
              members={members.data ?? []}
              onCancel={() => setOpenTask(null)}
              onSaved={() => {
                setOpenTask(null);
                toast('success', 'Tâche mise à jour');
                void tasks.reload();
              }}
              onDeleted={() => {
                setOpenTask(null);
                toast('success', 'Tâche supprimée');
                void tasks.reload();
              }}
            />
          ) : (
            <div className="flex flex-col gap-8">
              <h3 className="font-serif text-4xl leading-[1.05]">{openTask.title}</h3>
              {openTask.description && <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink-2">{openTask.description}</p>}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Meta label="Colonne">{STATUS_LABEL[openTask.status]}</Meta>
                <Meta label="Priorité">
                  <Badge color={PRIORITY_COLOR[openTask.priority]}>{PRIORITY_LABEL[openTask.priority]}</Badge>
                </Meta>
                <Meta label="Responsable">
                  {openTask.assignee ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={openTask.assignee.name} size={24} /> {openTask.assignee.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </Meta>
                <Meta label="Échéance">{formatFullDate(openTask.dueDate)}</Meta>
              </dl>
            </div>
          ))}
      </Modal>

      <Modal open={editing} onClose={() => setEditing(false)} title="Modifier le projet" wide>
        {editing && (
          <ProjectForm
            workspaceId={workspace.id}
            project={p}
            teams={teams.data ?? []}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              toast('success', 'Projet mis à jour');
              void project.reload();
            }}
          />
        )}
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Supprimer le projet">
        <p className="font-serif text-2xl leading-snug">
          « {p.name} » et ses {tasks.data?.length ?? 0} tâche{(tasks.data?.length ?? 0) > 1 ? 's' : ''} seront supprimés définitivement.
        </p>
        <div className="mt-8 flex gap-2">
          <Button variant="danger" onClick={deleteProject}>
            Supprimer
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}
