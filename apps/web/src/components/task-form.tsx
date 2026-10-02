'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER, toInputDate } from '@/lib/format';
import type { Member, Priority, Task, TaskStatus } from '@/lib/types';
import { Button, cx, ErrorNote, Field, Input, Select, Textarea } from './ui/primitives';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/**
 * Choix exclusif présenté comme une ligne de mots : le trait de couleur glisse
 * sous l'option retenue. Plus rapide qu'une liste déroulante, et lisible d'un
 * coup d'œil.
 */
function WordChoice<T extends string>({
  name,
  legend,
  options,
  value,
  label,
  color,
  onChange,
}: {
  name: string;
  legend: string;
  options: T[];
  value: T;
  label: Record<T, string>;
  color: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-rule-strong">
        {options.map((o) => (
          <label key={o} className={cx('relative cursor-pointer py-2 text-[15px] transition-colors', value === o ? 'text-ink' : 'text-faint hover:text-ink-2')}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="sr-only" />
            {label[o]}
            {value === o && (
              <motion.span layoutId={`${name}-mark`} className="absolute inset-x-0 -bottom-px h-[2px]" style={{ background: color[o] }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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
    <form onSubmit={submit} className="flex flex-col gap-7">
      {error && <ErrorNote>{error}</ErrorNote>}
      <div>
        <label htmlFor="t-title" className="sr-only">
          Titre
        </label>
        <textarea
          id="t-title"
          required
          maxLength={200}
          rows={2}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value.replace(/\n/g, ' ') })}
          placeholder="Titre de la tâche"
          autoFocus
          className="w-full resize-none border-0 bg-transparent p-0 font-serif text-4xl leading-[1.05] text-ink placeholder:text-faint focus:ring-0 focus:outline-none"
        />
      </div>
      <Field label="Description" htmlFor="t-desc">
        <Textarea id="t-desc" maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>

      <WordChoice name="t-status" legend="Colonne" options={STATUS_ORDER} value={form.status} label={STATUS_LABEL} color={STATUS_COLOR} onChange={(status) => setForm({ ...form, status })} />
      <WordChoice name="t-priority" legend="Priorité" options={PRIORITIES} value={form.priority} label={PRIORITY_LABEL} color={PRIORITY_COLOR} onChange={(priority) => setForm({ ...form, priority })} />

      <div className="grid gap-x-8 gap-y-7 sm:grid-cols-3">
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
        <Field label="Estimation (h)" htmlFor="t-estimate">
          <Input id="t-estimate" type="number" min={0} max={1000} value={form.estimate} onChange={(e) => setForm({ ...form, estimate: e.target.value })} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            {task ? 'Enregistrer' : 'Créer la tâche'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        </div>
        {task && onDeleted &&
          (confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg italic">Vraiment ?</span>
              <Button type="button" variant="danger" size="sm" loading={pending} onClick={remove}>
                Supprimer
              </Button>
              <button type="button" className="ink-link text-sm text-muted" onClick={() => setConfirmDelete(false)}>
                Non
              </button>
            </div>
          ) : (
            <button type="button" className="ink-link text-sm text-late" onClick={() => setConfirmDelete(true)}>
              Supprimer la tâche
            </button>
          ))}
      </div>
    </form>
  );
}
