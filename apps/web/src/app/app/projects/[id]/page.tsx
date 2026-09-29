'use client';

import { ArrowLeft, CalendarDays, Pencil, Plus, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { KanbanBoard } from '@/components/kanban';
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
  STATUS_LABEL,
} from '@/lib/format';
import type { Member, Project, Task, TaskStatus, Team } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
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

  if (project.error) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/app/projects" className="flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Projets
        </Link>
        <ErrorNote>{project.error}</ErrorNote>
      </div>
    );
  }
  if (!project.data) return <Spinner />;
  const p = project.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" /> Projets
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="size-3.5 rounded-[5px]" style={{ background: p.color }} />
              <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{p.name}</h1>
              <Badge color="#3ddbc8">{PROJECT_STATUS_LABEL[p.status]}</Badge>
            </div>
            {p.description && <p className="mt-2 max-w-2xl text-sm text-muted">{p.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" /> {p.team?.name ?? 'Sans équipe'}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> {formatFullDate(p.startDate)} → {formatFullDate(p.dueDate)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="size-3.5" /> Modifier
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} aria-label="Supprimer le projet">
                  <Trash2 className="size-3.5" />
                </Button>
              </>
            )}
            {canEditTasks && (
              <Button size="sm" onClick={() => setNewTaskStatus('TODO')}>
                <Plus className="size-4" /> Nouvelle tâche
              </Button>
            )}
          </div>
        </div>
      </div>

      {!canEditTasks && (
        <p className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-muted">
          Vous consultez ce projet en lecture seule.
        </p>
      )}

      {tasks.error && <ErrorNote>{tasks.error}</ErrorNote>}
      {tasks.data ? (
        <KanbanBoard
          tasks={tasks.data}
          canEdit={canEditTasks}
          onMove={move}
          onOpen={setOpenTask}
          onAdd={(status) => setNewTaskStatus(status)}
        />
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
            <div className="flex flex-col gap-4 text-sm">
              <h3 className="text-lg font-semibold">{openTask.title}</h3>
              {openTask.description && <p className="whitespace-pre-wrap text-muted">{openTask.description}</p>}
              <dl className="grid grid-cols-2 gap-3">
                <dt className="text-muted">Colonne</dt>
                <dd>{STATUS_LABEL[openTask.status]}</dd>
                <dt className="text-muted">Priorité</dt>
                <dd>
                  <Badge color={PRIORITY_COLOR[openTask.priority]}>{PRIORITY_LABEL[openTask.priority]}</Badge>
                </dd>
                <dt className="text-muted">Responsable</dt>
                <dd className="flex items-center gap-2">
                  {openTask.assignee ? (
                    <>
                      <Avatar name={openTask.assignee.name} size={22} /> {openTask.assignee.name}
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt className="text-muted">Échéance</dt>
                <dd>{formatFullDate(openTask.dueDate)}</dd>
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
        <p className="text-sm text-muted">
          « {p.name} » et ses {tasks.data?.length ?? 0} tâche(s) seront supprimés définitivement.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={deleteProject}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
