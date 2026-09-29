'use client';

import { FolderKanban, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Avatar, Button, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can } from '@/lib/format';
import type { Member, Team } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const COLORS = ['#7c6cff', '#3ddbc8', '#ec4899', '#f59e0b', '#0ea5e9', '#10b981'];

export default function TeamsPage() {
  const { workspace } = useAuth();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;
  const teams = useApi<Team[]>(base && `${base}/teams`);
  const members = useApi<Member[]>(base && `${base}/members`);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', color: COLORS[0] });
  const [editingMembers, setEditingMembers] = useState<Team | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!workspace || !base) return <Spinner />;
  const canManage = can(workspace.role, 'ADMIN');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`${base}/teams`, { method: 'POST', json: form });
      toast('success', `Équipe « ${form.name} » créée`);
      setCreating(false);
      setForm({ name: '', color: COLORS[0] });
      void teams.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function saveMembers() {
    if (!editingMembers) return;
    setPending(true);
    try {
      await api(`${base}/teams/${editingMembers.id}/members`, { method: 'PUT', json: { userIds: selection } });
      toast('success', 'Composition de l’équipe mise à jour');
      setEditingMembers(null);
      void teams.reload();
    } catch (err) {
      toast('error', errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function remove(team: Team) {
    try {
      await api(`${base}/teams/${team.id}`, { method: 'DELETE' });
      toast('success', `Équipe « ${team.name} » supprimée`);
      void teams.reload();
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Équipes"
        subtitle="Regroupez les membres par pôle et rattachez-leur des projets."
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nouvelle équipe
            </Button>
          )
        }
      />

      {teams.error && <ErrorNote>{teams.error}</ErrorNote>}
      {teams.loading && !teams.data && <Spinner />}
      {teams.data?.length === 0 && (
        <EmptyState icon={<Users className="size-5" />} title="Aucune équipe" text="Créez des équipes pour organiser vos membres et vos projets." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teams.data?.map((team) => (
          <article key={team.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl text-sm font-semibold text-ink" style={{ background: team.color }}>
                {team.name[0]}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{team.name}</h2>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <FolderKanban className="size-3" /> {team.projectCount} projet(s)
                </p>
              </div>
              {canManage && (
                <button type="button" onClick={() => remove(team)} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-danger" aria-label={`Supprimer ${team.name}`}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>

            <div className="mt-5 flex-1">
              {team.members.length === 0 ? (
                <p className="text-sm text-faint">Aucun membre.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {team.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5 text-sm">
                      <Avatar name={m.name} size={26} />
                      <span className="truncate">{m.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-5"
                onClick={() => {
                  setSelection(team.members.map((m) => m.id));
                  setEditingMembers(team);
                }}
              >
                <UserPlus className="size-3.5" /> Gérer les membres
              </Button>
            )}
          </article>
        ))}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle équipe">
        <form onSubmit={create} className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Nom" htmlFor="team-name">
            <Input id="team-name" required minLength={2} maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-muted">Couleur</legend>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={cx('size-7 rounded-full', form.color === c && 'ring-2 ring-fg ring-offset-2 ring-offset-surface')}
                  style={{ background: c }}
                  aria-label={`Couleur ${c}`}
                  aria-pressed={form.color === c}
                />
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={pending}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editingMembers !== null} onClose={() => setEditingMembers(null)} title={`Membres — ${editingMembers?.name ?? ''}`}>
        <ul className="flex flex-col gap-1">
          {members.data?.map((m) => {
            const checked = selection.includes(m.user.id);
            return (
              <li key={m.user.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelection((s) => (checked ? s.filter((id) => id !== m.user.id) : [...s, m.user.id]))
                    }
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <Avatar name={m.user.name} size={26} />
                  <span className="text-sm">{m.user.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditingMembers(null)}>
            Annuler
          </Button>
          <Button onClick={saveMembers} loading={pending}>
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
