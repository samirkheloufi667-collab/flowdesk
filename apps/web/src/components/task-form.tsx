'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { PRIORITY_LABEL, STATUS_LABEL, STATUS_ORDER, toInputDate } from '@/lib/format';
import type { Member, Priority, Task, TaskStatus } from '@/lib/types';
import { Button, ErrorNote, Field, Input, Select, Textarea } from './ui/primitives';

/** Création et modification d'une tâche. */
export function TaskForm({
  workspaceId,
  projectId,
  task,
  members,
  defaultStatus = 'TODO',
  onSaved,
  onDeleted,
  onCancel,
}: {
  workspaceId: string;
  projectId: string;
  task?: Task;
  members: Member[];
  defaultStatus?: TaskStatus;
  onSaved: (task: Task) => void;
  onDeleted?: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? ('MEDIUM' as Priority),
    assigneeId: task?.assigneeId ?? '',
    dueDate: toInputDate(task?.dueDate ?? null),
    estimate: task?.estimate?.toString() ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    // En modification, un champ vidé doit être effacé côté serveur : on envoie null.
    const empty = task ? null : undefined;
    const payload = {
      title: form.title,
      description: form.description || empty,
      status: form.status,
      priority: form.priority,
      assigneeId: form.assigneeId || empty,
      dueDate: form.dueDate || empty,
      estimate: form.estimate === '' ? empty : Number(form.estimate),
    };
    try {
      const saved = await api<Task>(
        task
          ? `/workspaces/${workspaceId}/tasks/${task.id}`
          : `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
        { method: task ? 'PATCH' : 'POST', json: payload },
      );
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  async function remove() {
    if (!task) return;
    setPending(true);
    try {
      await api(`/workspaces/${workspaceId}/tasks/${task.id}`, { method: 'DELETE' });
      onDeleted?.();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Titre" htmlFor="t-title">
        <Input id="t-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
      </Field>
      <Field label="Description" htmlFor="t-desc">
        <Textarea id="t-desc" maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Colonne" htmlFor="t-status">
          <Select id="t-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priorité" htmlFor="t-priority">
          <Select id="t-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsable" htmlFor="t-assignee">
          <Select id="t-assignee" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
            <option value="">Personne</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Échéance" htmlFor="t-due">
          <Input id="t-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </Field>
        <Field label="Estimation (heures)" htmlFor="t-estimate">
          <Input id="t-estimate" type="number" min={0} max={1000} value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {task && onDeleted ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Supprimer ?</span>
              <Button type="button" variant="danger" size="sm" loading={pending} onClick={remove}>
                Confirmer
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Non
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Supprimer
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" loading={pending}>
            {task ? 'Enregistrer' : 'Créer la tâche'}
          </Button>
        </div>
      </div>
    </form>
  );
}
