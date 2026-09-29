import type { Priority, ProjectStatus, ResourceType, Role, TaskStatus } from './types';

export const ROLE_RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };
/** Même règle que le serveur. L'interface masque les actions interdites ; l'API les refuse de toute façon. */
export const can = (role: Role | undefined, required: Role) =>
  !!role && ROLE_RANK[role] >= ROLE_RANK[required];

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: 'Propriétaire',
  ADMIN: 'Admin',
  MEMBER: 'Membre',
  VIEWER: 'Lecteur',
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'À faire',
  IN_PROGRESS: 'En cours',
  REVIEW: 'En revue',
  DONE: 'Terminé',
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

/** Couleur de chaque colonne du Kanban, réutilisée dans les graphiques. */
export const STATUS_COLOR: Record<TaskStatus, string> = {
  TODO: '#8a91a6',
  IN_PROGRESS: '#7c6cff',
  REVIEW: '#fbbf24',
  DONE: '#3ddbc8',
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: 'Planifié',
  ACTIVE: 'Actif',
  ON_HOLD: 'En pause',
  COMPLETED: 'Terminé',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: '#8a91a6',
  MEDIUM: '#60a5fa',
  HIGH: '#fbbf24',
  URGENT: '#fb7185',
};

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  PERSON: 'Personne',
  EQUIPMENT: 'Matériel',
  ROOM: 'Salle',
};

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const fullDateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—');
export const formatFullDate = (iso: string | null) => (iso ? fullDateFmt.format(new Date(iso)) : '—');

/** Nombre de jours avant l'échéance ; négatif si elle est dépassée. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/** `done` : un élément terminé n'est jamais « en retard », on affiche simplement sa date. */
export function dueLabel(iso: string | null, done = false): { text: string; late: boolean } | null {
  const days = daysUntil(iso);
  if (days === null) return null;
  if (done) return { text: formatDate(iso), late: false };
  if (days < 0) return { text: `En retard de ${-days} j`, late: true };
  if (days === 0) return { text: "Aujourd'hui", late: false };
  if (days === 1) return { text: 'Demain', late: false };
  return { text: formatDate(iso), late: false };
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** ISO -> valeur d'un champ <input type="date">. */
export const toInputDate = (iso: string | null) => (iso ? iso.slice(0, 10) : '');
