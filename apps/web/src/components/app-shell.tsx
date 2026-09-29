'use client';

import {
  Boxes,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/format';
import { Brand } from './brand';
import { Modal } from './ui/modal';
import { Avatar, Button, cx, ErrorNote, Field, Input, Select } from './ui/primitives';
import { useToast } from './ui/toast';

const NAV = [
  { href: '/app', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/app/my-tasks', label: 'Mes tâches', icon: CheckSquare },
  { href: '/app/projects', label: 'Projets', icon: FolderKanban },
  { href: '/app/teams', label: 'Équipes', icon: Users },
  { href: '/app/resources', label: 'Ressources', icon: Boxes },
  { href: '/app/members', label: 'Membres', icon: UserCog },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { me, workspace, selectWorkspace, logout, reload } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const created = await api<{ id: string }>('/workspaces', { method: 'POST', json: { name } });
      await reload();
      selectWorkspace(created.id);
      setCreating(false);
      setName('');
      toast('success', `Espace « ${name} » créé`);
      router.push('/app');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-1 pt-1">
        <Brand href="/app" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="workspace" className="px-1 text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
          Espace de travail
        </label>
        <div className="flex gap-1.5">
          <Select
            id="workspace"
            value={workspace?.id ?? ''}
            onChange={(e) => {
              selectWorkspace(e.target.value);
              onNavigate?.();
              router.push('/app');
            }}
            className="h-9 text-[13px]"
          >
            {me?.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Button variant="secondary" size="sm" className="h-9 w-9 shrink-0 !px-0" onClick={() => setCreating(true)} aria-label="Créer un espace">
            <Plus className="size-4" />
          </Button>
        </div>
        {workspace && (
          <p className="px-1 text-xs text-muted">
            Votre rôle : <span className="text-fg">{ROLE_LABEL[workspace.role]}</span>
          </p>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg',
              )}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />}
              <Icon className={cx('size-4', active ? 'text-accent-strong' : 'text-faint group-hover:text-muted')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3">
        <Avatar name={me?.name ?? '?'} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{me?.name}</p>
          <p className="truncate text-xs text-muted">{me?.email}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-fg"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <LogOut className="size-4" />
        </button>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvel espace de travail">
        <form onSubmit={createWorkspace} className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Nom de l’espace" htmlFor="new-workspace" hint="Vous en deviendrez propriétaire.">
            <Input id="new-workspace" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
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
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Le menu mobile se referme à chaque changement de page.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface/60 lg:block">
        <Sidebar />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur lg:hidden">
        <Brand href="/app" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg"
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Fermer le menu"
            >
              <X className="size-4" />
            </button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
    </div>
  );
}
