import { Injectable } from '@nestjs/common';
import type { ProjectStatus, TaskStatus } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { dashboardKey } from '../common/cache-keys';
import { PrismaService } from '../prisma/prisma.service';
import { loadAt } from '../resources/capacity';

const TTL_SECONDS = 60;

interface WorkspaceStats {
  projects: { total: number; byStatus: Record<ProjectStatus, number> };
  tasks: { total: number; byStatus: Record<TaskStatus, number>; overdue: number; completionRate: number };
  members: number;
  resources: { total: number; overbooked: number; averageUtilization: number };
  upcoming: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    priority: string;
    status: string;
    project: { id: string; name: string; color: string };
    assignee: { id: string; name: string } | null;
  }>;
  computedAt: string;
}

const emptyProjects = (): Record<ProjectStatus, number> => ({
  PLANNED: 0,
  ACTIVE: 0,
  ON_HOLD: 0,
  COMPLETED: 0,
});
const emptyTasks = (): Record<TaskStatus, number> => ({ TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 });

/**
 * Le tableau de bord agrège six requêtes : on le met en cache 60 secondes par
 * espace, et chaque écriture (tâche, projet, ressource) efface l'entrée.
 * Résultat : il est toujours à jour, mais recalculé une seule fois tant que
 * rien ne change, même si toute l'équipe l'ouvre en même temps.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async summary(workspaceId: string, userId: string) {
    const key = dashboardKey(workspaceId);
    let stats = await this.cache.get<WorkspaceStats>(key);
    const hit = stats !== null;
    if (!stats) {
      stats = await this.compute(workspaceId);
      await this.cache.set(key, stats, TTL_SECONDS);
    }

    // Propre à chaque utilisateur, donc hors du cache partagé.
    const myOpenTasks = await this.prisma.task.count({
      where: { assigneeId: userId, status: { not: 'DONE' }, project: { workspaceId } },
    });

    return { ...stats, myOpenTasks, cache: { hit, backend: this.cache.backend } };
  }

  private async compute(workspaceId: string): Promise<WorkspaceStats> {
    const now = new Date();
    const [projectGroups, taskGroups, overdue, members, resources, upcoming] = await Promise.all([
      this.prisma.project.groupBy({ by: ['status'], where: { workspaceId }, _count: { _all: true } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { project: { workspaceId } },
        _count: { _all: true },
      }),
      this.prisma.task.count({
        where: { project: { workspaceId }, status: { not: 'DONE' }, dueDate: { lt: now } },
      }),
      this.prisma.membership.count({ where: { workspaceId } }),
      this.prisma.resource.findMany({ where: { workspaceId }, include: { allocations: true } }),
      this.prisma.task.findMany({
        where: { project: { workspaceId }, status: { not: 'DONE' }, dueDate: { not: null } },
        orderBy: { dueDate: 'asc' },
        take: 6,
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
    ]);

    const projectsByStatus = emptyProjects();
    projectGroups.forEach((g) => (projectsByStatus[g.status] = g._count._all));
    const tasksByStatus = emptyTasks();
    taskGroups.forEach((g) => (tasksByStatus[g.status] = g._count._all));

    const taskTotal = Object.values(tasksByStatus).reduce((a, b) => a + b, 0);
    const utilizations = resources.map((r) => (100 * loadAt(r.allocations, now)) / r.capacity);

    return {
      projects: {
        total: Object.values(projectsByStatus).reduce((a, b) => a + b, 0),
        byStatus: projectsByStatus,
      },
      tasks: {
        total: taskTotal,
        byStatus: tasksByStatus,
        overdue,
        completionRate: taskTotal ? Math.round((100 * tasksByStatus.DONE) / taskTotal) : 0,
      },
      members,
      resources: {
        total: resources.length,
        overbooked: utilizations.filter((u) => u > 100).length,
        averageUtilization: utilizations.length
          ? Math.round(utilizations.reduce((a, b) => a + b, 0) / utilizations.length)
          : 0,
      },
      upcoming: upcoming.map((t) => ({ ...t, dueDate: t.dueDate?.toISOString() ?? null })),
      computedAt: now.toISOString(),
    };
  }
}
