'use client';

import {
  DndContext,
  DragEndEvent,
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
import { Clock, Plus } from 'lucide-react';
import { useState } from 'react';
import { dueLabel, PRIORITY_COLOR, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/lib/format';
import type { Task, TaskStatus } from '@/lib/types';
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

function TaskCard({ task, dragging, highlight }: { task: Task; dragging?: boolean; highlight?: boolean }) {
  const due = dueLabel(task.dueDate, task.status === 'DONE');
  return (
    <div
      className={cx(
        'rounded-xl border bg-surface-2 p-3.5 text-left transition-[border-color,box-shadow]',
        highlight ? 'border-accent shadow-[0_-2px_0_0_var(--color-accent)]' : 'border-line hover:border-line-strong',
        dragging && 'rotate-[1.5deg] border-accent shadow-2xl shadow-black/60',
      )}
    >
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        {due && task.status !== 'DONE' && (
          <span className={cx('text-xs', due.late ? 'font-medium text-danger' : 'text-muted')}>{due.text}</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {task.estimate != null && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-faint">
              <Clock className="size-3" />
              {task.estimate} h
            </span>
          )}
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
      {...drag.listeners}
      {...drag.attributes}
      onClick={() => onOpen(task)}
      className={cx('touch-manipulation outline-none', drag.isDragging && 'opacity-30', !disabled && 'cursor-grab active:cursor-grabbing')}
    >
      <TaskCard task={task} highlight={drop.isOver && !drag.isDragging} />
    </div>
  );
}

function Column({
  status,
  tasks,
  children,
  onAdd,
}: {
  status: TaskStatus;
  tasks: Task[];
  children: React.ReactNode;
  onAdd?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const estimate = tasks.reduce((sum, t) => sum + (t.estimate ?? 0), 0);
  return (
    <section
      ref={setNodeRef}
      className={cx(
        'flex w-[82vw] shrink-0 snap-start flex-col rounded-2xl border bg-surface/60 sm:w-72 lg:w-auto lg:min-w-0 lg:flex-1',
        isOver ? 'border-accent/60 bg-accent/5' : 'border-line',
      )}
      aria-label={STATUS_LABEL[status]}
    >
      <header className="flex items-center gap-2 px-4 pb-2 pt-4">
        <span className="size-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
        <h2 className="text-sm font-semibold">{STATUS_LABEL[status]}</h2>
        <span className="font-mono text-xs text-faint">{tasks.length}</span>
        {estimate > 0 && <span className="ml-auto font-mono text-[11px] text-faint">{estimate} h</span>}
      </header>
      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">{children}</div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="m-2 mt-0 flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-faint transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <Plus className="size-4" /> Ajouter
        </button>
      )}
    </section>
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
  // Un clic ouvre la tâche ; il faut bouger de 6 px (ou appuyer 180 ms au doigt) pour la déplacer.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleStart(e: DragStartEvent) {
    setActive(tasks.find((t) => t.id === e.active.id) ?? null);
  }

  function handleEnd(e: DragEndEvent) {
    setActive(null);
    if (!e.over) return;
    const moving = tasks.find((t) => t.id === e.active.id);
    if (!moving) return;
    const target = dropTarget(tasks, moving, String(e.over.id));
    if (!target || (target.status === moving.status && target.position === moving.position)) return;
    onMove(moving, target.status, target.position);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleStart} onDragEnd={handleEnd} onDragCancel={() => setActive(null)}>
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:snap-none sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
        {STATUS_ORDER.map((status) => {
          const column = tasks.filter((t) => t.status === status).sort(byPosition);
          return (
            <Column key={status} status={status} tasks={column} onAdd={canEdit ? () => onAdd(status) : undefined}>
              {column.map((task) => (
                <DraggableTask key={task.id} task={task} disabled={!canEdit} onOpen={onOpen} />
              ))}
              {column.length === 0 && (
                <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-faint">
                  {canEdit ? 'Déposez une tâche ici' : 'Aucune tâche'}
                </p>
              )}
            </Column>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
        {active && <TaskCard task={active} dragging />}
      </DragOverlay>
    </DndContext>
  );
}
