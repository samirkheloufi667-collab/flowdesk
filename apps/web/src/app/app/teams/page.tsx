'use client';

import { useState } from 'react';
import { Stagger } from '@/components/motion/Stagger';
import { Modal } from '@/components/ui/modal';
import { Avatar, Button, cx, EmptyState, ErrorNote, Field, InkPicker, Input, PageHeader, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, INK_COLORS } from '@/lib/format';
import type { Member, Team } from '@/lib/types';
import { useApi } from '@/lib/use-api';

/**
 * Les équipes présentées comme l'ours d'un journal : le nom du pôle en grand,
 * puis les noms de celles et ceux qui le composent.
 */
export default function TeamsPage() {
  const { workspace } = useAuth();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;
  const teams = useApi<Team[]>(base && `${base}/teams`);
  const members = useApi<Member[]>(base && `${base}/members`);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', color: INK_COLORS[0] });
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
      setForm({ name: '', color: INK_COLORS[0] });
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
    <div className="flex flex-col gap-12">
      <PageHeader
        index="L’ours"
        title="Équipes"
        subtitle="Les pôles de l’espace, et les personnes qui les font tourner. Rattachez-leur des projets."
        actions={canManage && <Button onClick={() => setCreating(true)}>Nouvelle équipe</Button>}
      />

      {teams.error && <ErrorNote>{teams.error}</ErrorNote>}
      {teams.loading && !teams.data && <Spinner />}
      {teams.data?.length === 0 && <EmptyState title="Pas encore d’équipe." text="Créez des équipes pour organiser vos membres et vos projets." />}

      {teams.data && teams.data.length > 0 && (
        <Stagger as="ol" watch={teams.data.length} className="-mt-12">
          {teams.data.map((team) => (
            <li key={team.id} data-reveal className="grid gap-6 border-b border-rule py-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <span aria-hidden className="block h-1 w-16" style={{ background: team.color }} />
                <h2 className="mt-5 font-serif text-5xl leading-none sm:text-6xl">{team.name}</h2>
                <p className="mt-4 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
                  {team.members.length} membre{team.members.length > 1 ? 's' : ''} · {team.projectCount} projet{team.projectCount > 1 ? 's' : ''}
                </p>
                {canManage && (
                  <div className="mt-5 flex gap-5 text-sm">
                    <button
                      type="button"
                      className="ink-link text-ink-2"
                      onClick={() => {
                        setSelection(team.members.map((m) => m.id));
                        setEditingMembers(team);
                      }}
                    >
                      Composer l’équipe
                    </button>
                    <button type="button" className="ink-link text-late" onClick={() => remove(team)}>
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-7 lg:pt-6">
                {team.members.length === 0 ? (
                  <p className="font-serif text-2xl text-faint italic">Personne pour l’instant.</p>
                ) : (
                  <ul className="grid gap-x-8 sm:grid-cols-2">
                    {team.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 border-t border-rule py-3">
                        <Avatar name={m.name} size={30} />
                        <span className="truncate font-serif text-xl">{m.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </Stagger>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle équipe">
        <form onSubmit={create} className="flex flex-col gap-7">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Nom" htmlFor="team-name">
            <Input id="team-name" required minLength={2} maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
          </Field>
          <InkPicker colors={INK_COLORS} value={form.color} onChange={(color) => setForm({ ...form, color })} />
          <div className="flex gap-2 border-t border-rule pt-6">
            <Button type="submit" loading={pending}>
              Créer l’équipe
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editingMembers !== null} onClose={() => setEditingMembers(null)} title={editingMembers?.name ?? 'Équipe'}>
        <p className="mb-4 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
          {selection.length} sélectionné{selection.length > 1 ? 's' : ''}
        </p>
        <ul className="border-t border-ink">
          {members.data?.map((m) => {
            const checked = selection.includes(m.user.id);
            return (
              <li key={m.user.id} className="border-b border-rule">
                <label className="group flex cursor-pointer items-center gap-4 py-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelection((s) => (checked ? s.filter((id) => id !== m.user.id) : [...s, m.user.id]))}
                    className="sr-only"
                  />
                  <span aria-hidden className={cx('flex size-5 items-center justify-center border transition-colors', checked ? 'border-accent' : 'border-ink-2')}>
                    <span className={cx('block size-2.5 bg-accent transition-transform duration-300', checked ? 'scale-100' : 'scale-0')} />
                  </span>
                  <span className={cx('font-serif text-xl transition-colors', checked ? 'text-ink' : 'text-muted group-hover:text-ink-2')}>{m.user.name}</span>
                  <span className="ml-auto truncate font-mono text-[11px] text-faint">{m.user.email}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 flex gap-2">
          <Button onClick={saveMembers} loading={pending}>
            Enregistrer
          </Button>
          <Button variant="ghost" onClick={() => setEditingMembers(null)}>
            Annuler
          </Button>
        </div>
      </Modal>
    </div>
  );
}
