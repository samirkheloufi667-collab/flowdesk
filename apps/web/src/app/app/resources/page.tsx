'use client';

import { AlertTriangle, Boxes, CalendarPlus, DoorOpen, Monitor, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge, Button, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Progress, Select, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, formatDate, RESOURCE_TYPE_LABEL } from '@/lib/format';
import type { Project, Resource, ResourceType } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const TYPE_ICON: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  PERSON: User,
  EQUIPMENT: Monitor,
  ROOM: DoorOpen,
};

/** Vert sous 80 %, ambre jusqu'à 100 %, rose au-delà. */
const loadColor = (utilization: number) =>
  utilization > 100 ? 'var(--color-danger)' : utilization >= 80 ? 'var(--color-warn)' : 'var(--color-teal)';

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

export default function ResourcesPage() {
  const { workspace } = useAuth();
  const toast = useToast();
  const base = workspace ? `/workspaces/${workspace.id}` : null;
  const resources = useApi<Resource[]>(base && `${base}/resources`);
  const projects = useApi<Project[]>(base && `${base}/projects`);

  const [creating, setCreating] = useState(false);
  const [resourceForm, setResourceForm] = useState({ name: '', type: 'PERSON' as ResourceType, capacity: '35', unit: '' });
  const [allocating, setAllocating] = useState<Resource | null>(null);
  const [allocForm, setAllocForm] = useState({ projectId: '', amount: '', startDate: today(), endDate: inDays(30) });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!workspace || !base) return <Spinner />;
  const canManage = can(workspace.role, 'ADMIN');

  async function createResource(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`${base}/resources`, {
        method: 'POST',
        json: {
          name: resourceForm.name,
          type: resourceForm.type,
          capacity: Number(resourceForm.capacity),
          unit: resourceForm.unit || undefined,
        },
      });
      toast('success', `Ressource « ${resourceForm.name} » ajoutée`);
      setCreating(false);
      setResourceForm({ name: '', type: 'PERSON', capacity: '35', unit: '' });
      void resources.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function allocate(e: React.FormEvent) {
    e.preventDefault();
    if (!allocating) return;
    setPending(true);
    setError(null);
    try {
      await api(`${base}/resources/${allocating.id}/allocations`, {
        method: 'POST',
        json: { ...allocForm, amount: Number(allocForm.amount) },
      });
      toast('success', `Allocation ajoutée pour ${allocating.name}`);
      setAllocating(null);
      void resources.reload();
    } catch (err) {
      // Le 409 du serveur explique la surréservation : on l'affiche tel quel dans le formulaire.
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function removeAllocation(id: string) {
    try {
      await api(`${base}/allocations/${id}`, { method: 'DELETE' });
      toast('success', 'Allocation supprimée');
      void resources.reload();
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  async function removeResource(r: Resource) {
    try {
      await api(`${base}/resources/${r.id}`, { method: 'DELETE' });
      toast('success', `Ressource « ${r.name} » supprimée`);
      void resources.reload();
    } catch (err) {
      toast('error', errorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ressources"
        subtitle="Personnes, salles et matériel : qui est réservé, sur quel projet, et jusqu’où."
        actions={
          canManage && (
            <Button onClick={() => { setError(null); setCreating(true); }}>
              <Plus className="size-4" /> Nouvelle ressource
            </Button>
          )
        }
      />

      {resources.error && <ErrorNote>{resources.error}</ErrorNote>}
      {resources.loading && !resources.data && <Spinner />}
      {resources.data?.length === 0 && (
        <EmptyState icon={<Boxes className="size-5" />} title="Aucune ressource" text="Ajoutez les personnes et le matériel que vous planifiez sur vos projets." />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {resources.data?.map((r) => {
          const Icon = TYPE_ICON[r.type];
          return (
            <article key={r.id} className={cx('rounded-2xl border bg-surface p-5', r.overbooked ? 'border-danger/40' : 'border-line')}>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{r.name}</h2>
                  <p className="text-xs text-muted">
                    {RESOURCE_TYPE_LABEL[r.type]} · capacité {r.capacity} {r.unit}
                  </p>
                </div>
                {r.overbooked && (
                  <Badge color="#fb7185">
                    <AlertTriangle className="size-3" /> Surréservé
                  </Badge>
                )}
                {canManage && (
                  <button type="button" onClick={() => removeResource(r)} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-danger" aria-label={`Supprimer ${r.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted">Occupation aujourd’hui</span>
                  <span className="font-mono tabular-nums">
                    {r.load}/{r.capacity} {r.unit} · <span style={{ color: loadColor(r.utilization) }}>{r.utilization} %</span>
                  </span>
                </div>
                <Progress value={r.utilization} color={loadColor(r.utilization)} />
              </div>

              <ul className="mt-5 flex flex-col gap-1.5">
                {r.allocations.length === 0 && <li className="text-sm text-faint">Aucune allocation.</li>}
                {r.allocations.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: a.project.color }} />
                    <span className="min-w-0 flex-1 truncate">{a.project.name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted">{a.amount} {r.unit}</span>
                    <span className="hidden text-xs text-faint sm:inline">
                      {formatDate(a.startDate)} → {formatDate(a.endDate)}
                    </span>
                    {canManage && (
                      <button type="button" onClick={() => removeAllocation(a.id)} className="rounded p-1 text-faint hover:text-danger" aria-label="Supprimer l’allocation">
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {canManage && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setError(null);
                    setAllocForm({ projectId: projects.data?.[0]?.id ?? '', amount: '', startDate: today(), endDate: inDays(30) });
                    setAllocating(r);
                  }}
                >
                  <CalendarPlus className="size-3.5" /> Réserver
                </Button>
              )}
            </article>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle ressource">
        <form onSubmit={createResource} className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Nom" htmlFor="r-name">
            <Input id="r-name" required minLength={2} maxLength={60} value={resourceForm.name} onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type" htmlFor="r-type">
              <Select id="r-type" value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })}>
                {(Object.keys(RESOURCE_TYPE_LABEL) as ResourceType[]).map((t) => (
                  <option key={t} value={t}>{RESOURCE_TYPE_LABEL[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Capacité" htmlFor="r-capacity">
              <Input id="r-capacity" type="number" min={1} max={10000} required value={resourceForm.capacity} onChange={(e) => setResourceForm({ ...resourceForm, capacity: e.target.value })} />
            </Field>
            <Field label="Unité" htmlFor="r-unit">
              <Input id="r-unit" placeholder={resourceForm.type === 'PERSON' ? 'h/sem' : 'unités'} maxLength={20} value={resourceForm.unit} onChange={(e) => setResourceForm({ ...resourceForm, unit: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Annuler</Button>
            <Button type="submit" loading={pending}>Ajouter</Button>
          </div>
        </form>
      </Modal>

      <Modal open={allocating !== null} onClose={() => setAllocating(null)} title={`Réserver — ${allocating?.name ?? ''}`}>
        <form onSubmit={allocate} className="flex flex-col gap-4">
          {error && <ErrorNote>{error}</ErrorNote>}
          <p className="text-sm text-muted">
            Capacité : {allocating?.capacity} {allocating?.unit}. FlowDesk refuse toute réservation qui la dépasserait, même un seul jour.
          </p>
          <Field label="Projet" htmlFor="a-project">
            <Select id="a-project" required value={allocForm.projectId} onChange={(e) => setAllocForm({ ...allocForm, projectId: e.target.value })}>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={`Quantité (${allocating?.unit ?? ''})`} htmlFor="a-amount">
              <Input id="a-amount" type="number" min={1} required value={allocForm.amount} onChange={(e) => setAllocForm({ ...allocForm, amount: e.target.value })} autoFocus />
            </Field>
            <Field label="Du" htmlFor="a-start">
              <Input id="a-start" type="date" required value={allocForm.startDate} onChange={(e) => setAllocForm({ ...allocForm, startDate: e.target.value })} />
            </Field>
            <Field label="Au" htmlFor="a-end">
              <Input id="a-end" type="date" required value={allocForm.endDate} onChange={(e) => setAllocForm({ ...allocForm, endDate: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAllocating(null)}>Annuler</Button>
            <Button type="submit" loading={pending}>Réserver</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
