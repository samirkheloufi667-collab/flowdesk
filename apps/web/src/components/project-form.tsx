'use client';

import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { PROJECT_STATUS_LABEL, toInputDate } from '@/lib/format';
import type { Project, ProjectStatus, Team } from '@/lib/types';
import { Button, cx, ErrorNote, Field, Input, Select, Textarea } from './ui/primitives';

const COLORS = ['#7c6cff', '#3ddbc8', '#ec4899', '#f59e0b', '#0ea5e9', '#10b981', '#f43f5e', '#a3e635'];

/** Création et modification d'un projet : même formulaire, requête différente. */
export function ProjectForm({
  workspaceId,
  project,
  teams,
  onSaved,
  onCancel,
}: {
  workspaceId: string;
  project?: Project;
  teams: Team[];
  onSaved: (project: Project) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    status: project?.status ?? ('ACTIVE' as ProjectStatus),
    color: project?.color ?? COLORS[0],
    teamId: project?.teamId ?? '',
    startDate: toInputDate(project?.startDate ?? null),
    dueDate: toInputDate(project?.dueDate ?? null),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || (project ? null : undefined),
      status: form.status,
      color: form.color,
      teamId: form.teamId || (project ? null : undefined),
      startDate: form.startDate || (project ? null : undefined),
      dueDate: form.dueDate || (project ? null : undefined),
    };
    try {
      const saved = await api<Project>(
        project ? `/workspaces/${workspaceId}/projects/${project.id}` : `/workspaces/${workspaceId}/projects`,
        { method: project ? 'PATCH' : 'POST', json: payload },
      );
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <ErrorNote>{error}</ErrorNote>}
      <Field label="Nom du projet" htmlFor="p-name">
        <Input id="p-name" required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
      </Field>
      <Field label="Description" htmlFor="p-desc">
        <Textarea id="p-desc" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Statut" htmlFor="p-status">
          <Select id="p-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
            {(Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Équipe" htmlFor="p-team">
          <Select id="p-team" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Aucune</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Début" htmlFor="p-start">
          <Input id="p-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </Field>
        <Field label="Échéance" htmlFor="p-due">
          <Input id="p-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-muted">Couleur</legend>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, color: c })}
              className={cx('size-7 rounded-full transition-transform hover:scale-110', form.color === c && 'ring-2 ring-fg ring-offset-2 ring-offset-surface')}
              style={{ background: c }}
              aria-label={`Couleur ${c}`}
              aria-pressed={form.color === c}
            />
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" loading={pending}>
          {project ? 'Enregistrer' : 'Créer le projet'}
        </Button>
      </div>
    </form>
  );
}
