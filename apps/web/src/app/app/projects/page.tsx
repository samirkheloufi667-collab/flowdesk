'use client';

import { CalendarDays, FolderKanban, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ProjectForm } from '@/components/project-form';
import SpotlightCard from '@/components/reactbits/SpotlightCard';
import { Modal } from '@/components/ui/modal';
import { Badge, Button, cx, EmptyState, ErrorNote, PageHeader, Progress, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { can, dueLabel, PROJECT_STATUS_LABEL } from '@/lib/format';
import type { Project, ProjectStatus, Team } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const FILTERS: Array<{ key: ProjectStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Tous' },
  { key: 'ACTIVE', label: 'Actifs' },
  { key: 'PLANNED', label: 'Planifiés' },
  { key: 'ON_HOLD', label: 'En pause' },
  { key: 'COMPLETED', label: 'Terminés' },
];

const STATUS_BADGE: Record<ProjectStatus, string> = {
  PLANNED: '#60a5fa',
  ACTIVE: '#3ddbc8',
  ON_HOLD: '#fbbf24',
  COMPLETED: '#8a91a6',
};

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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projets"
        subtitle={projects.data ? `${projects.data.length} projet(s) dans ${workspace.name}` : undefined}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nouveau projet
            </Button>
          )
        }
      />

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {FILTERS.map((f) => {
          const count = f.key === 'ALL' ? projects.data?.length : projects.data?.filter((p) => p.status === f.key).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cx(
                'shrink-0 rounded-lg px-3 py-1.5 text-sm transition-colors',
                filter === f.key ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {f.label}
              {count !== undefined && <span className="ml-1.5 font-mono text-xs text-faint">{count}</span>}
            </button>
          );
        })}
      </div>

      {projects.error && <ErrorNote>{projects.error}</ErrorNote>}
      {projects.loading && !projects.data && <Spinner />}

      {projects.data && list.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="size-5" />}
          title={filter === 'ALL' ? 'Aucun projet' : 'Aucun projet dans cette catégorie'}
          text={canManage ? 'Créez un premier projet pour y organiser les tâches de votre équipe.' : 'Un administrateur de l’espace peut en créer.'}
          action={
            canManage && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Nouveau projet
              </Button>
            )
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const due = dueLabel(p.dueDate, p.status === 'COMPLETED');
          return (
            <Link key={p.id} href={`/app/projects/${p.id}`} className="group block rounded-2xl">
              <SpotlightCard
                className="!flex !h-full !flex-col !rounded-2xl !border-line !bg-surface !p-5 transition-colors group-hover:!border-line-strong"
                spotlightColor="rgba(124, 108, 255, 0.14)"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="size-3 shrink-0 rounded-[4px]" style={{ background: p.color }} />
                    <h2 className="truncate font-semibold">{p.name}</h2>
                  </div>
                  <Badge color={STATUS_BADGE[p.status]}>{PROJECT_STATUS_LABEL[p.status]}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 min-h-10 text-sm text-muted">{p.description || 'Pas de description.'}</p>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs text-muted">
                    <span>
                      {p.doneCount}/{p.taskCount} tâches
                    </span>
                    <span className="font-mono text-fg">{p.progress} %</span>
                  </div>
                  <Progress value={p.progress ?? 0} color={p.color} />
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    {p.team?.name ?? 'Sans équipe'}
                  </span>
                  {due && (
                    <span className={cx('flex items-center gap-1.5', due.late && p.status !== 'COMPLETED' && 'text-danger')}>
                      <CalendarDays className="size-3.5" />
                      {due.text}
                    </span>
                  )}
                </div>
              </SpotlightCard>
            </Link>
          );
        })}
      </div>

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
