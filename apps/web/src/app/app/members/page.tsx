'use client';

import { UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Avatar, Badge, Button, ErrorNote, Field, Input, PageHeader, Select, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, ROLE_LABEL, ROLE_RANK } from '@/lib/format';
import type { Member, Role } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const ROLE_COLOR: Record<Role, string> = {
  OWNER: '#9a8cff',
  ADMIN: '#3ddbc8',
  MEMBER: '#60a5fa',
  VIEWER: '#8a91a6',
};

const ROLE_HELP: Record<Role, string> = {
  OWNER: 'Tous les droits, dont la gestion des rôles.',
  ADMIN: 'Gère projets, équipes, ressources et membres.',
  MEMBER: 'Crée et modifie les tâches.',
  VIEWER: 'Consulte sans rien modifier — idéal pour un client.',
};

const ROLES: Role[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];

export default function MembersPage() {
  const { workspace, me, reload } = useAuth();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;
  const members = useApi<Member[]>(base && `${base}/members`);

  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'MEMBER' as Role });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!workspace || !base) return <Spinner />;
  const isOwner = can(workspace.role, 'OWNER');
  const canManage = can(workspace.role, 'ADMIN');
  // On ne peut attribuer un rôle supérieur au sien : même règle que le serveur.
  const grantable = ROLES.filter((r) => ROLE_RANK[r] <= ROLE_RANK[workspace.role]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`${base}/members`, { method: 'POST', json: form });
      toast('success', `${form.email} a rejoint l’espace`);
      setInviting(false);
      setForm({ email: '', role: 'MEMBER' });
      void members.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function changeRole(member: Member, role: Role) {
    try {
      await api(`${base}/members/${member.id}`, { method: 'PATCH', json: { role } });
      toast('success', `${member.user.name} est maintenant ${ROLE_LABEL[role].toLowerCase()}`);
      void members.reload();
      if (member.user.id === me?.id) void reload();
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  async function remove(member: Member) {
    try {
      await api(`${base}/members/${member.id}`, { method: 'DELETE' });
      toast('success', `${member.user.name} a été retiré de l’espace`);
      void members.reload();
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Membres"
        subtitle={members.data ? `${members.data.length} personne(s) dans ${workspace.name}` : undefined}
        actions={
          canManage && (
            <Button onClick={() => { setError(null); setInviting(true); }}>
              <UserPlus className="size-4" /> Ajouter un membre
            </Button>
          )
        }
      />

      {members.error && <ErrorNote>{members.error}</ErrorNote>}
      {members.loading && !members.data && <Spinner />}

      {members.data && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {members.data.map((m) => {
            const self = m.user.id === me?.id;
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                <Avatar name={m.user.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.user.name} {self && <span className="font-normal text-faint">(vous)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{m.user.email}</p>
                </div>
                {isOwner && !self ? (
                  <Select
                    aria-label={`Rôle de ${m.user.name}`}
                    value={m.role}
                    onChange={(e) => changeRole(m, e.target.value as Role)}
                    className="h-8 w-36 text-[13px]"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </Select>
                ) : (
                  <Badge color={ROLE_COLOR[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                )}
                {canManage && !self && (m.role !== 'OWNER' || isOwner) && (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-danger"
                    aria-label={`Retirer ${m.user.name}`}
                    title="Retirer de l’espace"
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r} className="rounded-xl border border-line bg-surface/60 p-4">
            <Badge color={ROLE_COLOR[r]}>{ROLE_LABEL[r]}</Badge>
            <p className="mt-2 text-xs leading-relaxed text-muted">{ROLE_HELP[r]}</p>
          </div>
        ))}
      </section>

      <Modal open={inviting} onClose={() => setInviting(false)} title="Ajouter un membre">
        <form onSubmit={invite} className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="E-mail" htmlFor="m-email" hint="La personne doit déjà avoir un compte FlowDesk.">
            <Input id="m-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </Field>
          <Field label="Rôle" htmlFor="m-role" hint={ROLE_HELP[form.role]}>
            <Select id="m-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {grantable.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setInviting(false)}>Annuler</Button>
            <Button type="submit" loading={pending}>Ajouter</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
