'use client';

import { useRef, useState } from 'react';
import { gsap, prefersReducedMotion, useGSAP } from '@/components/motion/gsap';
import { Stagger } from '@/components/motion/Stagger';
import { Modal } from '@/components/ui/modal';
import { Button, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { can, formatDate, RESOURCE_TYPE_LABEL } from '@/lib/format';
import type { Project, Resource, ResourceType } from '@/lib/types';
import { useApi } from '@/lib/use-api';

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const loadTone = (utilization: number) => (utilization > 100 ? 'text-late' : utilization >= 80 ? 'text-wait' : 'text-ink');

/**
 * Jauge de charge : chaque réservation du jour est un segment à la couleur de
 * son projet, posé contre un trait vertical qui marque la capacité. Ce qui
 * dépasse le trait est hachuré : la surréservation se voit avant de se lire.
 */
function Gauge({ resource }: { resource: Resource }) {
  const ref = useRef<HTMLDivElement>(null);
  const now = today();
  const active = resource.allocations.filter((a) => a.startDate.slice(0, 10) <= now && a.endDate.slice(0, 10) >= now);
  const sum = active.reduce((s, a) => s + a.amount, 0);
  const scale = Math.max(resource.capacity, resource.load, sum, 1);
  const capacityAt = (resource.capacity / scale) * 100;
  const overflow = Math.max(resource.load, sum) > resource.capacity;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-seg]', {
        scaleX: 0,
        transformOrigin: 'left',
        duration: 1.1,
        stagger: 0.1,
        ease: 'expo.inOut',
        scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      });
      gsap.from('[data-cap]', { scaleY: 0, duration: 0.8, delay: 0.4, ease: 'expo.out', scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true } });
    },
    { scope: ref, dependencies: [resource.load, resource.allocations.length] },
  );

  return (
    <div ref={ref} className="pt-6">
      <div className="relative h-12">
        <div className="absolute inset-0 flex gap-[2px]">
          {active.map((a) => (
            <div key={a.id} data-seg title={`${a.project.name} : ${a.amount} ${resource.unit}`} style={{ width: `${(a.amount / scale) * 100}%`, background: a.project.color }} />
          ))}
        </div>
        {overflow && (
          <div
            aria-hidden
            className="absolute inset-y-0 right-0"
            style={{
              left: `${capacityAt}%`,
              backgroundImage: 'repeating-linear-gradient(135deg, var(--color-paper) 0 3px, transparent 3px 8px)',
            }}
          />
        )}
        <div data-cap className="absolute -top-6 -bottom-2 w-px origin-bottom bg-ink" style={{ left: `${capacityAt}%` }}>
          <span className="absolute -top-0.5 left-1.5 font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-ink uppercase">
            capacité {resource.capacity} {resource.unit}
          </span>
        </div>
        {active.length === 0 && <div className="absolute inset-0 border border-dashed border-rule-strong" />}
      </div>
    </div>
  );
}

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
  const overbooked = resources.data?.filter((r) => r.overbooked).length ?? 0;

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
      toast('success', `Réservation ajoutée pour ${allocating.name}`);
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
      toast('success', 'Réservation supprimée');
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
    <div className="flex flex-col gap-12">
      <PageHeader
        index="Planning"
        title="Ressources"
        subtitle={
          resources.data
            ? overbooked
              ? `${overbooked} ressource${overbooked > 1 ? 's' : ''} au-delà de sa capacité aujourd’hui. Le trait noir marque la limite ; ce qui dépasse est hachuré.`
              : 'Personnes, salles et matériel. Le trait noir marque la capacité : FlowDesk refuse toute réservation qui le franchirait.'
            : undefined
        }
        actions={
          canManage && (
            <Button
              onClick={() => {
                setError(null);
                setCreating(true);
              }}
            >
              Nouvelle ressource
            </Button>
          )
        }
      />

      {resources.error && <ErrorNote>{resources.error}</ErrorNote>}
      {resources.loading && !resources.data && <Spinner />}
      {resources.data?.length === 0 && <EmptyState title="Aucune ressource." text="Ajoutez les personnes et le matériel que vous planifiez sur vos projets." />}

      {resources.data && resources.data.length > 0 && (
        <Stagger as="ol" watch={resources.data.length} className="-mt-12">
          {resources.data.map((r) => (
            <li key={r.id} data-reveal className="grid gap-x-10 gap-y-6 border-b border-rule py-10 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">{RESOURCE_TYPE_LABEL[r.type]}</p>
                <h2 className="mt-2 font-serif text-4xl leading-none sm:text-5xl">{r.name}</h2>
                <p className={cx('mt-5 font-serif text-6xl leading-none italic', loadTone(r.utilization))}>
                  {r.utilization}
                  <span className="text-2xl not-italic"> %</span>
                </p>
                <p className="mt-2 text-sm text-muted">
                  {r.load} sur {r.capacity} {r.unit} aujourd’hui
                  {r.overbooked && <span className="text-late"> — surréservé</span>}
                </p>
                {canManage && (
                  <div className="mt-5 flex gap-5 text-sm">
                    <button
                      type="button"
                      className="ink-link text-ink-2"
                      onClick={() => {
                        setError(null);
                        setAllocForm({ projectId: projects.data?.[0]?.id ?? '', amount: '', startDate: today(), endDate: inDays(30) });
                        setAllocating(r);
                      }}
                    >
                      Réserver
                    </button>
                    <button type="button" className="ink-link text-late" onClick={() => removeResource(r)}>
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-8">
                <Gauge resource={r} />
                {r.allocations.length === 0 ? (
                  <p className="mt-6 font-serif text-xl text-faint italic">Aucune réservation.</p>
                ) : (
                  <table className="mt-6 w-full text-left text-sm">
                    <thead>
                      <tr className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">
                        <th className="pb-2 font-normal">Projet</th>
                        <th className="pb-2 text-right font-normal">Quantité</th>
                        <th className="hidden pb-2 pl-6 font-normal sm:table-cell">Période</th>
                        {canManage && <th className="pb-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {r.allocations.map((a) => (
                        <tr key={a.id} className="border-t border-rule">
                          <td className="py-2.5">
                            <span className="flex items-center gap-2.5">
                              <span className="inline-block size-2 rotate-45" style={{ background: a.project.color }} />
                              {a.project.name}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums">
                            {a.amount} {r.unit}
                          </td>
                          <td className="hidden py-2.5 pl-6 font-mono text-[12px] text-muted sm:table-cell">
                            {formatDate(a.startDate)} → {formatDate(a.endDate)}
                          </td>
                          {canManage && (
                            <td className="py-2.5 text-right">
                              <button type="button" onClick={() => removeAllocation(a.id)} className="ink-link text-[13px] text-muted hover:text-late" aria-label={`Supprimer la réservation ${a.project.name}`}>
                                Retirer
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </li>
          ))}
        </Stagger>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle ressource">
        <form onSubmit={createResource} className="flex flex-col gap-7">
          {error && <ErrorNote>{error}</ErrorNote>}
          <Field label="Nom" htmlFor="r-name">
            <Input id="r-name" required minLength={2} maxLength={60} value={resourceForm.name} onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })} autoFocus />
          </Field>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-3">
            <Field label="Type" htmlFor="r-type">
              <Select id="r-type" value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })}>
                {(Object.keys(RESOURCE_TYPE_LABEL) as ResourceType[]).map((t) => (
                  <option key={t} value={t}>
                    {RESOURCE_TYPE_LABEL[t]}
                  </option>
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
          <div className="flex gap-2 border-t border-rule pt-6">
            <Button type="submit" loading={pending}>
              Ajouter
            </Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={allocating !== null} onClose={() => setAllocating(null)} title={`Réserver — ${allocating?.name ?? ''}`}>
        <form onSubmit={allocate} className="flex flex-col gap-7">
          {error && <ErrorNote>{error}</ErrorNote>}
          <p className="font-serif text-xl leading-snug">
            Capacité : {allocating?.capacity} {allocating?.unit}. Une réservation qui la dépasserait, même un seul jour, sera refusée.
          </p>
          <Field label="Projet" htmlFor="a-project">
            <Select id="a-project" required value={allocForm.projectId} onChange={(e) => setAllocForm({ ...allocForm, projectId: e.target.value })}>
              {projects.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-3">
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
          <div className="flex gap-2 border-t border-rule pt-6">
            <Button type="submit" loading={pending}>
              Réserver
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAllocating(null)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
