'use client';

import { useState } from 'react';
import { Stagger } from '@/components/motion/Stagger';
import { Modal } from '@/components/ui/modal';
import { Avatar, Badge, Button, ErrorNote, Field, Input, PageHeader, SectionLabel, Select, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, ROLE_LABEL, ROLE_RANK } from '@/lib/format';
import type { Member, Role } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const ROLE_COLOR: Record<Role, string> = {
  OWNER: '#141412',
  ADMIN: '#2f3bff',
  MEMBER: '#2f6b46',
  VIEWER: '#9c978b',
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
    <div className="flex flex-col gap-14">
      <PageHeader
        index={workspace.name}
        title="Membres"
        subtitle={members.data ? `${members.data.length} personne${members.data.length > 1 ? 's' : ''}, quatre rôles. Chacun voit et modifie exactement ce que le sien autorise.` : undefined}
        actions={
          canManage && (
            <Button
              onClick={() => {
                setError(null);
                setInviting(true);
              }}
            >
              Ajouter un membre
            </Button>
          )
        }
      />

      {members.error && <ErrorNote>{members.error}</ErrorNote>}
      {members.loading && !members.data && <Spinner />}

      <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        {members.data && (
          <Stagger as="ol" watch={members.data.length} className="-mt-14 lg:col-span-8">
            {members.data.map((m) => {
              const self = m.user.id === me?.id;
              return (
                <li key={m.id} data-reveal className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-rule py-5">
                  <Avatar name={m.user.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-2xl leading-tight">
                      {m.user.name} {self && <span className="text-base text-faint italic">— vous</span>}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[12px] text-muted">{m.user.email}</p>
                  </div>
                  {isOwner && !self ? (
                    <Select aria-label={`Rôle de ${m.user.name}`} value={m.role} onChange={(e) => changeRole(m, e.target.value as Role)} className="h-9 w-36 text-[14px]">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Badge color={ROLE_COLOR[m.role]}>{ROLE_LABEL[m.role]}</Badge>
                  )}
                  {canManage && !self && (m.role !== 'OWNER' || isOwner) && (
                    <button type="button" onClick={() => remove(m)} className="ink-link text-[13px] text-muted hover:text-late" title="Retirer de l’espace">
                      Retirer
                    </button>
                  )}
                </li>
              );
            })}
          </Stagger>
        )}

        <aside className="lg:col-span-4">
          <SectionLabel>Les rôles</SectionLabel>
          <dl>
            {ROLES.map((r, i) => (
              <div key={r} className="border-b border-rule py-4">
                <dt className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-serif text-2xl" style={{ color: ROLE_COLOR[r] }}>
                    {ROLE_LABEL[r]}
                  </span>
                </dt>
                <dd className="mt-1 pl-7 text-sm leading-relaxed text-muted">{ROLE_HELP[r]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <Modal open={inviting} onClose={() => setInviting(false)} title="Ajouter un membre">
        <form onSubmit={invite} className="flex flex-col gap-7">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="E-mail" htmlFor="m-email" hint="La personne doit déjà avoir un compte FlowDesk.">
            <Input id="m-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </Field>
          <Field label="Rôle" htmlFor="m-role" hint={ROLE_HELP[form.role]}>
            <Select id="m-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {grantable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2 border-t border-rule pt-6">
            <Button type="submit" loading={pending}>
              Ajouter
            </Button>
            <Button type="button" variant="ghost" onClick={() => setInviting(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
