import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { dashboardKey } from '../common/cache-keys';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';

const toDate = (value: string | null | undefined) =>
  value === undefined ? undefined : value === null ? null : new Date(value);

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Liste des projets avec leur avancement, calculé en une seule requête groupée. */
  async list(workspaceId: string) {
    const [projects, done] = await Promise.all([
      this.prisma.project.findMany({
        where: { workspaceId },
        include: {
          team: { select: { id: true, name: true, color: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.task.groupBy({
        by: ['projectId'],
        where: { project: { workspaceId }, status: 'DONE' },
        _count: { _all: true },
      }),
    ]);

    const doneByProject = new Map(done.map((d) => [d.projectId, d._count._all]));
    return projects.map(({ _count, ...project }) => {
      const doneCount = doneByProject.get(project.id) ?? 0;
      return {
        ...project,
        taskCount: _count.tasks,
        doneCount,
        progress: _count.tasks ? Math.round((100 * doneCount) / _count.tasks) : 0,
      };
    });
  }

  async get(workspaceId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, workspaceId },
      include: { team: { select: { id: true, name: true, color: true } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    return project;
  }

  async create(workspaceId: string, dto: CreateProjectDto) {
    await this.assertTeam(workspaceId, dto.teamId);
    this.assertDates(dto.startDate, dto.dueDate);
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        status: dto.status,
        color: dto.color,
        startDate: toDate(dto.startDate),
        dueDate: toDate(dto.dueDate),
        teamId: dto.teamId ?? undefined,
      },
    });
    await this.cache.del(dashboardKey(workspaceId));
    return project;
  }

  async update(workspaceId: string, id: string, dto: UpdateProjectDto) {
    const current = await this.get(workspaceId, id);
    await this.assertTeam(workspaceId, dto.teamId);
    this.assertDates(
      dto.startDate === undefined ? current.startDate?.toISOString() : dto.startDate,
      dto.dueDate === undefined ? current.dueDate?.toISOString() : dto.dueDate,
    );
    const project = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        color: dto.color,
        startDate: toDate(dto.startDate),
        dueDate: toDate(dto.dueDate),
        teamId: dto.teamId,
      },
    });
    await this.cache.del(dashboardKey(workspaceId));
    return project;
  }

  async remove(workspaceId: string, id: string) {
    await this.get(workspaceId, id);
    await this.prisma.project.delete({ where: { id } });
    await this.cache.del(dashboardKey(workspaceId));
  }

  /** Une équipe d'un autre espace ne doit pas pouvoir être rattachée. */
  private async assertTeam(workspaceId: string, teamId: string | null | undefined) {
    if (!teamId) return;
    const team = await this.prisma.team.findFirst({ where: { id: teamId, workspaceId } });
    if (!team) throw new BadRequestException('Équipe introuvable dans cet espace');
  }

  private assertDates(start?: string | null, due?: string | null) {
    if (start && due && new Date(due) < new Date(start)) {
      throw new BadRequestException("L'échéance ne peut pas précéder le début du projet");
    }
  }
}
