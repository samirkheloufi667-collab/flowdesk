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
  TODO: '#9c978b',
  IN_PROGRESS: '#2f3bff',
  REVIEW: '#b07a12',
  DONE: '#2f6b46',
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
  LOW: '#9c978b',
  MEDIUM: '#6e6a60',
  HIGH: '#b07a12',
  URGENT: '#d4421e',
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

/** Couleur du marqueur de statut d'un projet. */
export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  PLANNED: '#6e6a60',
  ACTIVE: '#2f3bff',
  ON_HOLD: '#b07a12',
  COMPLETED: '#2f6b46',
};

/** Encres d'imprimerie proposées pour les projets et les équipes : assez soutenues pour se lire sur le papier. */
export const INK_COLORS = ['#2f3bff', '#d4421e', '#b07a12', '#2f6b46', '#7a2e8c', '#0f7b8a', '#141412', '#c2185b'];
