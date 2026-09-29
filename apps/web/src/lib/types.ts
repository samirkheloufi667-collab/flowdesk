export type Role = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER';
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ResourceType = 'PERSON' | 'EQUIPMENT' | 'ROOM';

export interface WorkspaceRef {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  workspaces: WorkspaceRef[];
}

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

export interface TeamRef {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  startDate: string | null;
  dueDate: string | null;
  teamId: string | null;
  team: TeamRef | null;
  taskCount?: number;
  doneCount?: number;
  progress?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  estimate: number | null;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  assignee: UserRef | null;
  project?: { id: string; name: string; color: string };
}

export interface Member {
  id: string;
  role: Role;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

export interface Team extends TeamRef {
  members: UserRef[];
  projectCount: number;
}

export interface Allocation {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  project: { id: string; name: string; color: string };
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  unit: string;
  load: number;
  utilization: number;
  overbooked: boolean;
  allocations: Allocation[];
}

export interface Dashboard {
  projects: { total: number; byStatus: Record<ProjectStatus, number> };
  tasks: { total: number; byStatus: Record<TaskStatus, number>; overdue: number; completionRate: number };
  members: number;
  resources: { total: number; overbooked: number; averageUtilization: number };
  upcoming: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    priority: Priority;
    status: TaskStatus;
    project: { id: string; name: string; color: string };
    assignee: { id: string; name: string } | null;
  }>;
  myOpenTasks: number;
  cache: { hit: boolean; backend: 'redis' | 'memory' };
  computedAt: string;
}
