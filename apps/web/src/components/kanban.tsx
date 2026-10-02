'use client';

import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useLayoutEffect, useRef, useState } from 'react';
import { dueLabel, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/lib/format';
import type { Task, TaskStatus } from '@/lib/types';
import { Flip, gsap, prefersReducedMotion } from './motion/gsap';
import { Avatar, Badge, cx } from './ui/primitives';

const STEP = 1024;
const byPosition = (a: Task, b: Task) => a.position - b.position;

/**
 * Calcule la nouvelle colonne et la nouvelle position d'une tâche déposée.
 * Déposée sur une carte : elle prend la place juste avant, à mi-chemin de la
 * précédente. Déposée dans le vide d'une colonne : elle va en dernier.
 */
export function dropTarget(tasks: Task[], moving: Task, overId: string): { status: TaskStatus; position: number } | null {
  if (overId.startsWith('col:')) {
    const status = overId.slice(4) as TaskStatus;
    const column = tasks.filter((t) => t.status === status && t.id !== moving.id).sort(byPosition);
    return { status, position: column.length ? column[column.length - 1].position + STEP : STEP };
  }
  const targetId = overId.slice(5);
  if (targetId === moving.id) return null;
  const target = tasks.find((t) => t.id === targetId);
  if (!target) return null;
  const column = tasks.filter((t) => t.status === target.status && t.id !== moving.id).sort(byPosition);
  const previous = column[column.findIndex((t) => t.id === targetId) - 1];
  return {
    status: target.status,
    position: previous ? (previous.position + target.position) / 2 : target.position / 2,
  };
}

/** Fiche d'une tâche : du papier, un filet, pas de coins arrondis. */
function TaskCard({ task, lifted }: { task: Task; lifted?: boolean }) {
  const due = dueLabel(task.dueDate, task.status === 'DONE');
  const urgent = task.priority === 'URGENT' && task.status !== 'DONE';
  return (
    <div
      className={cx(
        'relative border bg-[#fbf9f4] px-4 pt-3.5 pb-3 text-left transition-[border-color,transform,box-shadow] duration-300',
        lifted ? 'border-ink shadow-[6px_8px_0_0_var(--color-ink)]' : 'border-rule hover:-translate-y-0.5 hover:border-ink-2',
        task.status === 'DONE' && !lifted && 'opacity-70',
      )}
    >
      {urgent && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-late" />}
      <p className={cx('text-[15px] leading-snug', task.status === 'DONE' && 'line-through decoration-rule-strong')}>{task.title}</p>
      <div className="mt-3 flex items-center gap-3">
        <Badge color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        {due && task.status !== 'DONE' && (
          <span className={cx('font-mono text-[11px]', due.late ? 'text-late' : 'text-muted')}>{due.text}</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {task.estimate != null && <span className="font-mono text-[11px] text-faint">{task.estimate} h</span>}
          {task.assignee && <Avatar name={task.assignee.name} size={22} />}
        </span>
      </div>
    </div>
  );
}

function DraggableTask({ task, disabled, onOpen }: { task: Task; disabled: boolean; onOpen: (t: Task) => void }) {
  const drag = useDraggable({ id: task.id, disabled });
  const drop = useDroppable({ id: `task:${task.id}` });
  return (
    <div
      ref={(node) => {
        drag.setNodeRef(node);
        drop.setNodeRef(node);
      }}
      data-flip-id={task.id}
      {...drag.listeners}
      {...drag.attributes}
      onClick={() => onOpen(task)}
      className={cx('relative touch-manipulation outline-none', drag.isDragging && 'opacity-25', !disabled && 'cursor-grab active:cursor-grabbing')}
    >
      {/* Repère d'insertion : la carte déposée ici se placera juste au-dessus. */}
      <span
        aria-hidden
        className={cx('absolute inset-x-0 -top-[7px] h-[2px] origin-left bg-accent transition-transform duration-300', drop.isOver && !drag.isDragging ? 'scale-x-100' : 'scale-x-0')}
      />
      <TaskCard task={task} />
    </div>
  );
}

function Column({ status, tasks, children, onAdd }: { status: TaskStatus; tasks: Task[]; children: React.ReactNode; onAdd?: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const estimate = tasks.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABEL[status]}
      className={cx(
        'flex w-[80vw] shrink-0 snap-start flex-col border-r border-rule pr-4 pl-4 transition-colors duration-300 first:pl-0 last:border-r-0 sm:w-72 lg:w-auto lg:min-w-0 lg:flex-1',
        isOver && 'bg-paper-2/70',
      )}
    >
      <header className="pb-4">
        <span className="block h-[2px] w-10" style={{ background: STATUS_COLOR[status] }} />
        <div className="mt-3 flex items-baseline gap-3">
          <h2 className="font-serif text-[28px] leading-none">{STATUS_LABEL[status]}</h2>
          <span className="font-mono text-xs text-muted">{String(tasks.length).padStart(2, '0')}</span>
          {estimate > 0 && <span className="ml-auto font-mono text-[11px] text-faint">{estimate} h</span>}
        </div>
      </header>
      <div className="flex min-h-32 flex-1 flex-col gap-3">{children}</div>
      {onAdd && (
        <button type="button" onClick={onAdd} className="mt-4 self-start text-sm text-muted transition-colors hover:text-ink">
          <span className="ink-link">+ Ajouter une tâche</span>
        </button>
      )}
    </section>
  );
}

/**
 * La carte soulevée suit le pointeur et s'incline selon la vitesse du geste,
 * comme une feuille qu'on tient : elle se redresse dès qu'on ralentit.
 */
function LiftedCard({ task, velocity }: { task: Task; velocity: React.RefObject<number> }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const rotate = gsap.quickTo(ref.current, 'rotation', { duration: 0.5, ease: 'power3.out' });
    let frame = 0;
    const tick = () => {
      rotate(Math.max(-9, Math.min(9, (velocity.current ?? 0) * 0.35)));
      velocity.current = (velocity.current ?? 0) * 0.82;
      frame = requestAnimationFrame(tick);
    };
    gsap.fromTo(ref.current, { scale: 1 }, { scale: 1.03, duration: 0.35, ease: 'back.out(2)' });
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [velocity]);
  return (
    <div ref={ref} className="will-change-transform">
      <TaskCard task={task} lifted />
    </div>
  );
}

export function KanbanBoard({
  tasks,
  canEdit,
  onMove,
  onOpen,
  onAdd,
}: {
  tasks: Task[];
  canEdit: boolean;
  onMove: (task: Task, status: TaskStatus, position: number) => void;
  onOpen: (task: Task) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  const [active, setActive] = useState<Task | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const velocity = useRef(0);
  const lastX = useRef(0);

  // Un clic ouvre la tâche ; il faut bouger de 6 px (ou appuyer 180 ms au doigt) pour la déplacer.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Après chaque changement de la liste, les cartes glissent de leur ancienne
  // place vers la nouvelle (GSAP Flip) au lieu de sauter.
  useLayoutEffect(() => {
    if (!flipState.current) return;
    Flip.from(flipState.current, { duration: 0.75, ease: 'expo.out', nested: true, absoluteOnLeave: true });
    flipState.current = null;
  }, [tasks]);

  function handleStart(e: DragStartEvent) {
    lastX.current = 0;
    velocity.current = 0;
    setActive(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function handleMove(e: DragMoveEvent) {
    velocity.current = e.delta.x - lastX.current + velocity.current * 0.5;
    lastX.current = e.delta.x;
  }

  function handleEnd(e: DragEndEvent) {
    setActive(null);
    if (!e.over) return;
    const moving = tasks.find((t) => t.id === e.active.id);
    if (!moving) return;
    const target = dropTarget(tasks, moving, String(e.over.id));
    if (!target || (target.status === moving.status && target.position === moving.position)) return;
    if (board.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(board.current.querySelectorAll('[data-flip-id]'));
    }
    onMove(moving, target.status, target.position);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleStart}
      onDragMove={handleMove}
      onDragEnd={handleEnd}
      onDragCancel={() => setActive(null)}
    >
      <div ref={board} className="-mx-5 flex snap-x snap-mandatory scroll-px-5 overflow-x-auto px-5 pb-6 sm:-mx-8 sm:snap-none sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
        {STATUS_ORDER.map((status) => {
          const column = tasks.filter((t) => t.status === status).sort(byPosition);
          return (
            <Column key={status} status={status} tasks={column} onAdd={canEdit ? () => onAdd(status) : undefined}>
              {column.map((task) => (
                <DraggableTask key={task.id} task={task} disabled={!canEdit} onOpen={onOpen} />
              ))}
              {column.length === 0 && (
                <p className="border-t border-dashed border-rule-strong pt-4 font-serif text-xl text-faint italic">{canEdit ? 'Rien ici. Déposez une tâche.' : 'Rien ici.'}</p>
              )}
            </Column>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' }}>
        {active && <LiftedCard task={active} velocity={velocity} />}
      </DragOverlay>
    </DndContext>
  );
}
