'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Project } from '@/lib/types';
import { cx } from './ui/primitives';

interface Command {
  id: string;
  group: 'Aller à' | 'Projets' | 'Espaces' | 'Compte';
  label: string;
  hint?: string;
  run: () => void;
}

export const NAV = [
  { href: '/app', label: 'Aujourd’hui' },
  { href: '/app/my-tasks', label: 'Mes tâches' },
  { href: '/app/projects', label: 'Projets' },
  { href: '/app/teams', label: 'Équipes' },
  { href: '/app/resources', label: 'Ressources' },
  { href: '/app/members', label: 'Membres' },
];

/** Recherche approximative : toutes les lettres tapées doivent apparaître dans l'ordre. */
function matches(label: string, query: string) {
  const text = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let i = 0;
  for (const ch of text) if (ch === q[i]) i++;
  return i === q.length;
}

/**
 * Palette de commandes (Ctrl + K, ou ⌘ + K) : on va n'importe où au clavier,
 * sans chercher dans les menus. Flèches pour choisir, Entrée pour valider.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { me, workspace, selectWorkspace, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    setTimeout(() => input.current?.focus(), 30);
    if (workspace) {
      api<Project[]>(`/workspaces/${workspace.id}/projects`)
        .then(setProjects)
        .catch(() => setProjects([]));
    }
  }, [open, workspace]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = NAV.map((n) => ({ id: n.href, group: 'Aller à', label: n.label, run: () => go(n.href) }));
    projects.forEach((p) =>
      list.push({ id: `p-${p.id}`, group: 'Projets', label: p.name, hint: p.team?.name, run: () => go(`/app/projects/view?id=${p.id}`) }),
    );
    me?.workspaces
      .filter((w) => w.id !== workspace?.id)
      .forEach((w) =>
        list.push({
          id: `w-${w.id}`,
          group: 'Espaces',
          label: `Passer à ${w.name}`,
          run: () => {
            selectWorkspace(w.id);
            go('/app');
          },
        }),
      );
    list.push({
      id: 'logout',
      group: 'Compte',
      label: 'Se déconnecter',
      run: async () => {
        onClose();
        await logout();
        router.replace('/login');
      },
    });
    return query ? list.filter((c) => matches(c.label, query)) : list;
  }, [projects, me, workspace, query, go, selectWorkspace, logout, onClose, router]);

  useEffect(() => setActive(0), [query]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, commands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commands[active]?.run();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  let lastGroup = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/25 px-4 pt-[14vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label="Palette de commandes"
        >
          <motion.div
            className="w-full max-w-xl border border-ink bg-paper shadow-[12px_12px_0_0_var(--color-ink)]"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 border-b border-ink px-5">
              <span className="font-serif text-2xl text-muted italic">→</span>
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Aller à une page, un projet…"
                className="h-14 flex-1 bg-transparent text-lg outline-none placeholder:text-faint"
                aria-label="Rechercher une commande"
                aria-activedescendant={commands[active]?.id}
              />
              <kbd className="font-mono text-[11px] text-faint">Échap</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
              {commands.length === 0 && <li className="px-5 py-6 font-serif text-xl text-muted italic">Rien ne correspond.</li>}
              {commands.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                return (
                  <li key={c.id} id={c.id} role="option" aria-selected={i === active}>
                    {header && <p className="px-5 pt-3 pb-1 font-mono text-[10px] tracking-[0.16em] text-faint uppercase">{header}</p>}
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={c.run}
                      className={cx('relative flex w-full items-center justify-between px-5 py-2.5 text-left text-[15px]', i === active ? 'text-paper' : 'text-ink')}
                    >
                      {i === active && <motion.span layoutId="cmd-active" className="absolute inset-0 -z-0 bg-ink" transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} />}
                      <span className="relative">{c.label}</span>
                      {c.hint && <span className="relative font-mono text-[11px] opacity-60">{c.hint}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
