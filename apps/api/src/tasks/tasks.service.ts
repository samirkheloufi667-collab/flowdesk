import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TaskStatus } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { dashboardKey } from '../common/cache-keys';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto';

/** Écart entre deux tâches consécutives d'une colonne. */
export const POSITION_STEP = 1024;
/** En dessous de cet écart, les flottants perdent en précision : on renumérote. */
const MIN_GAP = 1e-6;

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
} as const;

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listForProject(workspaceId: string, projectId: string) {
    await this.assertProject(workspaceId, projectId);
    return this.prisma.task.findMany({
      where: { projectId },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });
  }

  /** Mes tâches ouvertes dans l'espace, triées par échéance. */
  mine(workspaceId: string, userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId, status: { not: 'DONE' }, project: { workspaceId } },
      include: { ...taskInclude, project: { select: { id: true, name: true, color: true } } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }],
    });
  }

  async create(workspaceId: string, projectId: string, creatorId: string, dto: CreateTaskDto) {
    await this.assertProject(workspaceId, projectId);
    await this.assertAssignee(workspaceId, dto.assigneeId);

    const status: TaskStatus = dto.status ?? 'TODO';
    const task = await this.prisma.task.create({
      data: {
        projectId,
        creatorId,
        title: dto.title,
        description: dto.description,
        status,
        priority: dto.priority,
        assigneeId: dto.assigneeId ?? undefined,
        dueDate: toDate(dto.dueDate),
        estimate: dto.estimate ?? undefined,
        position: (await this.lastPosition(projectId, status)) + POSITION_STEP,
      },
      include: taskInclude,
    });
    await this.touch(workspaceId);
    return task;
  }

  async update(workspaceId: string, id: string, dto: UpdateTaskDto) {
    await this.find(workspaceId, id);
    await this.assertAssignee(workspaceId, dto.assigneeId);
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        dueDate: toDate(dto.dueDate),
        estimate: dto.estimate,
      },
      include: taskInclude,
    });
    await this.touch(workspaceId);
    return task;
  }

  /**
   * Déplace une tâche. Le client calcule la position comme la moyenne de ses
   * deux voisines ; si l'écart devient trop petit pour un flottant, on
   * renumérote la colonne avec des pas réguliers.
   */
  async move(workspaceId: string, id: string, dto: MoveTaskDto) {
    const task = await this.find(workspaceId, id);
    const moved = await this.prisma.task.update({
      where: { id },
      data: { status: dto.status, position: dto.position },
      include: taskInclude,
    });

    const neighbours = await this.prisma.task.findMany({
      where: { projectId: task.projectId, status: dto.status },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });
    const crowded = neighbours.some(
      (t, i) => i > 0 && t.position - neighbours[i - 1].position < MIN_GAP,
    );
    if (crowded) {
      await this.prisma.$transaction(
        neighbours.map((t, i) =>
          this.prisma.task.update({
            where: { id: t.id },
            data: { position: (i + 1) * POSITION_STEP },
          }),
        ),
      );
    }

    await this.touch(workspaceId);
    return crowded ? this.prisma.task.findUniqueOrThrow({ where: { id }, include: taskInclude }) : moved;
  }

  async remove(workspaceId: string, id: string) {
    await this.find(workspaceId, id);
    await this.prisma.task.delete({ where: { id } });
    await this.touch(workspaceId);
  }

  /**
   * On cherche la tâche AVEC la contrainte d'espace : connaître l'identifiant
   * d'une tâche d'un autre client ne suffit pas pour la lire ou la modifier.
   */
  private async find(workspaceId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, project: { workspaceId } } });
    if (!task) throw new NotFoundException('Tâche introuvable');
    return task;
  }

  private async assertProject(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, workspaceId } });
    if (!project) throw new NotFoundException('Projet introuvable');
  }

  private async assertAssignee(workspaceId: string, userId: string | null | undefined) {
    if (!userId) return;
    const member = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member) throw new BadRequestException("Cette personne n'est pas membre de l'espace");
  }

  private async lastPosition(projectId: string, status: TaskStatus) {
    const last = await this.prisma.task.findFirst({
      where: { projectId, status },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return last?.position ?? 0;
  }

  private touch(workspaceId: string) {
    return this.cache.del(dashboardKey(workspaceId));
  }
}
