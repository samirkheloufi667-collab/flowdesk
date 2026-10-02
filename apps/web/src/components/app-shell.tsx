'use client';

import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/format';
import { Brand } from './brand';
import { CommandPalette, NAV } from './command-palette';
import { Modal } from './ui/modal';
import { Button, cx, ErrorNote, Field, Input } from './ui/primitives';
import { useToast } from './ui/toast';

const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const isActive = (pathname: string, href: string) =>
  href === '/app' ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(href);

/**
 * Cadre de l'application, à la manière d'un journal : un bandeau (titre,
 * date du jour, espace de travail) puis les rubriques. Le trait qui souligne
 * la rubrique courante glisse d'une page à l'autre.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, workspace, selectWorkspace, logout, reload } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => setMenu(false), [pathname]);

  // Ctrl + K (ou ⌘ + K) ouvre la palette de commandes, partout dans l'application.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
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

  const nav = (
    <nav className="flex gap-6 overflow-x-auto [scrollbar-width:none] lg:gap-8" aria-label="Rubriques">
      {NAV.map(({ href, label }, i) => {
        const active = isActive(pathname, href);
        return (
          <Link key={href} href={href} className={cx('relative shrink-0 py-3 text-[15px] transition-colors', active ? 'text-ink' : 'text-muted hover:text-ink')}>
            <span className="mr-1.5 font-mono text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
            {label}
            {active && <motion.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-px h-[2px] bg-ink" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink bg-paper/92 backdrop-blur-sm">
        <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
          <div className="flex items-center justify-between gap-4 border-b border-rule py-3">
            <div className="flex items-baseline gap-5">
              <Brand href="/app" />
              <span className="hidden font-mono text-[11px] tracking-[0.1em] text-muted capitalize md:inline">{today.format(new Date())}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => setPalette(true)}
                className="hidden items-center gap-3 border border-rule-strong px-3 py-1.5 text-sm text-muted transition-colors hover:border-ink hover:text-ink sm:flex"
              >
                Rechercher
                <kbd className="font-mono text-[10px] tracking-wider">Ctrl K</kbd>
              </button>
              <div className="hidden items-center gap-2 lg:flex">
                <label htmlFor="ws" className="sr-only">
                  Espace de travail
                </label>
                <select
                  id="ws"
                  value={workspace?.id ?? ''}
                  onChange={(e) => {
                    selectWorkspace(e.target.value);
                    router.push('/app');
                  }}
                  className="max-w-48 cursor-pointer border-0 bg-transparent py-1 pr-6 pl-0 text-right text-sm font-medium focus:ring-0"
                >
                  {me?.workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setCreating(true)} className="ink-link text-sm text-muted hover:text-ink" title="Créer un espace">
                  + espace
                </button>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.replace('/login');
                }}
                className="ink-link hidden text-sm text-muted hover:text-ink lg:inline"
              >
                Déconnexion
              </button>
              <button type="button" onClick={() => setMenu((m) => !m)} className="font-mono text-[11px] tracking-[0.14em] uppercase lg:hidden" aria-expanded={menu}>
                {menu ? 'Fermer' : 'Menu'}
              </button>
            </div>
          </div>
          <div className="hidden items-center justify-between lg:flex">
            {nav}
            {workspace && (
              <p className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
                {me?.name} · {ROLE_LABEL[workspace.role]}
              </p>
            )}
          </div>
        </div>

        {/* Menu mobile : les rubriques en grand, comme un sommaire. */}
        <AnimatePresence>
          {menu && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-rule lg:hidden"
            >
              <div className="px-5 py-6 sm:px-8">
                <ol className="flex flex-col">
                  {NAV.map(({ href, label }, i) => (
                    <li key={href} className="border-b border-rule">
                      <Link href={href} className={cx('flex items-baseline gap-4 py-3 font-serif text-3xl', isActive(pathname, href) ? 'text-ink italic' : 'text-ink-2')}>
                        <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex flex-col gap-4">
                  <label htmlFor="ws-mobile" className="font-mono text-[11px] tracking-[0.12em] text-muted uppercase">
                    Espace de travail
                  </label>
                  <select
                    id="ws-mobile"
                    value={workspace?.id ?? ''}
                    onChange={(e) => {
                      selectWorkspace(e.target.value);
                      router.push('/app');
                    }}
                    className="border-0 border-b border-rule-strong bg-transparent px-0 text-[15px] focus:ring-0"
                  >
                    {me?.workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-5 text-sm">
                    <button type="button" className="ink-link" onClick={() => setPalette(true)}>
                      Rechercher
                    </button>
                    <button type="button" className="ink-link" onClick={() => setCreating(true)}>
                      Nouvel espace
                    </button>
                    <button
                      type="button"
                      className="ink-link text-late"
                      onClick={async () => {
                        await logout();
                        router.replace('/login');
                      }}
                    >
                      Déconnexion
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-[1360px] px-5 pt-10 pb-24 sm:px-8 sm:pt-14">{children}</main>

      <footer className="mx-auto flex max-w-[1360px] flex-wrap justify-between gap-2 border-t border-rule px-5 py-6 font-mono text-[10px] tracking-[0.12em] text-faint uppercase sm:px-8">
        <span>© {new Date().getFullYear()} Samir Kheloufi — tous droits réservés</span>
        <span>FlowDesk · données fictives</span>
      </footer>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvel espace">
        <form onSubmit={createWorkspace} className="flex flex-col gap-6">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Nom de l’espace" htmlFor="new-workspace" hint="Vous en deviendrez propriétaire.">
            <Input id="new-workspace" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={pending}>
              Créer l’espace
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
