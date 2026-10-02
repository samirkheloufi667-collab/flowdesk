'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Stagger } from '@/components/motion/Stagger';
import { ProjectForm } from '@/components/project-form';
import { Modal } from '@/components/ui/modal';
import { Badge, Button, cx, EmptyState, ErrorNote, PageHeader, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { can, dueLabel, PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE } from '@/lib/format';
import type { Project, ProjectStatus, Team } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const FILTERS: Array<{ key: ProjectStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Tous' },
  { key: 'ACTIVE', label: 'Actifs' },
  { key: 'PLANNED', label: 'Planifiés' },
  { key: 'ON_HOLD', label: 'En pause' },
  { key: 'COMPLETED', label: 'Terminés' },
];

/**
 * Les projets présentés comme un sommaire : un numéro, un grand titre, une
 * ligne de détails. Au survol, une bande de la couleur du projet glisse sous
 * la ligne et le titre se décale, comme un doigt qui suit la page.
 */
export default function ProjectsPage() {
  const { workspace } = useAuth();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;
  const projects = useApi<Project[]>(base && `${base}/projects`);
  const teams = useApi<Team[]>(base && `${base}/teams`);
  const [filter, setFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [creating, setCreating] = useState(false);

  if (!workspace) return <Spinner />;
  const canManage = can(workspace.role, 'ADMIN');
  const list = (projects.data ?? []).filter((p) => filter === 'ALL' || p.status === filter);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        index={`Sommaire — ${workspace.name}`}
        title="Projets"
        subtitle={projects.data ? `${projects.data.length} projet${projects.data.length > 1 ? 's' : ''} en cours d’écriture, de la première tâche à la dernière.` : undefined}
        actions={canManage && <Button onClick={() => setCreating(true)}>Nouveau projet</Button>}
      />

      <div className="-mt-4 flex gap-6 overflow-x-auto border-b border-rule [scrollbar-width:none]" role="tablist" aria-label="Filtrer les projets">
        {FILTERS.map((f) => {
          const count = f.key === 'ALL' ? projects.data?.length : projects.data?.filter((p) => p.status === f.key).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={cx('relative shrink-0 py-3 text-[15px] transition-colors', active ? 'text-ink' : 'text-muted hover:text-ink')}
            >
              {f.label}
              {count !== undefined && <sup className="ml-1 font-mono text-[10px] text-faint">{count}</sup>}
              {active && <motion.span layoutId="filter-underline" className="absolute inset-x-0 -bottom-px h-[2px] bg-ink" transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />}
            </button>
          );
        })}
      </div>

      {projects.error && <ErrorNote>{projects.error}</ErrorNote>}
      {projects.loading && !projects.data && <Spinner />}

      {projects.data && list.length === 0 && (
        <EmptyState
          title={filter === 'ALL' ? 'Pas encore de projet.' : 'Rien dans cette rubrique.'}
          text={canManage ? 'Créez un premier projet pour y organiser les tâches de votre équipe.' : 'Un administrateur de l’espace peut en créer.'}
          action={canManage && <Button size="sm" onClick={() => setCreating(true)}>Nouveau projet</Button>}
        />
      )}

      {list.length > 0 && (
        <Stagger as="ol" watch={`${filter}-${list.length}`} className="-mt-4">
          {list.map((p, i) => {
            const due = dueLabel(p.dueDate, p.status === 'COMPLETED');
            const progress = p.progress ?? 0;
            return (
              <li key={p.id} data-reveal className="border-b border-rule">
                <Link href={`/app/projects/view?id=${p.id}`} className="group relative grid grid-cols-[2.5rem_1fr] gap-x-4 overflow-hidden py-7 sm:grid-cols-[3.5rem_1fr_11rem] sm:gap-x-8">
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 origin-bottom scale-y-0 opacity-[0.08] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-y-100"
                    style={{ background: p.color }}
                  />
                  <span className="pt-2 font-mono text-xs text-faint">{String(i + 1).padStart(2, '0')}</span>

                  <div className="min-w-0">
                    <h2 className="flex items-baseline gap-3 font-serif text-4xl leading-[1.02] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-3 sm:text-5xl">
                      <span aria-hidden className="inline-block size-2.5 shrink-0 -translate-y-2 rotate-45" style={{ background: p.color }} />
                      <span className="min-w-0 break-words">{p.name}</span>
                    </h2>
                    {p.description && <p className="mt-3 line-clamp-2 max-w-2xl text-[15px] text-muted">{p.description}</p>}
                    <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                      <Badge color={PROJECT_STATUS_TONE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                      <span>{p.team?.name ?? 'Sans équipe'}</span>
                      {due && <span className={cx('font-mono text-[12px]', due.late && p.status !== 'COMPLETED' && 'text-late')}>{due.text}</span>}
                    </p>
                  </div>

                  <div className="col-start-2 mt-5 sm:col-start-3 sm:mt-0 sm:text-right">
                    <p className="font-serif text-5xl leading-none italic sm:text-6xl">
                      {progress}
                      <span className="text-2xl not-italic text-muted"> %</span>
                    </p>
                    <p className="mt-2 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
                      {p.doneCount}/{p.taskCount} tâches
                    </p>
                    <span className="relative mt-3 block h-px w-full bg-rule">
                      <span className="absolute inset-y-[-1px] left-0 transition-[width] duration-1000" style={{ width: `${progress}%`, background: p.color }} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </Stagger>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouveau projet" wide>
        <ProjectForm
          workspaceId={workspace.id}
          teams={teams.data ?? []}
          onCancel={() => setCreating(false)}
          onSaved={(p) => {
            setCreating(false);
            toast('success', `Projet « ${p.name} » créé`);
            void projects.reload();
          }}
        />
      </Modal>
    </div>
  );
}
