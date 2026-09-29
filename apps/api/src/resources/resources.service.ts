import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { dashboardKey } from '../common/cache-keys';
import { PrismaService } from '../prisma/prisma.service';
import { loadAt, peakLoad } from './capacity';
import { CreateAllocationDto, CreateResourceDto } from './dto';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Ressources avec leurs allocations et leur taux d'occupation du jour. */
  async list(workspaceId: string) {
    const resources = await this.prisma.resource.findMany({
      where: { workspaceId },
      include: {
        allocations: {
          include: { project: { select: { id: true, name: true, color: true } } },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const today = new Date();
    return resources.map((resource) => {
      const load = loadAt(resource.allocations, today);
      return {
        ...resource,
        load,
        utilization: Math.round((100 * load) / resource.capacity),
        overbooked: load > resource.capacity,
      };
    });
  }

  async create(workspaceId: string, dto: CreateResourceDto) {
    try {
      const resource = await this.prisma.resource.create({
        data: {
          workspaceId,
          name: dto.name,
          type: dto.type,
          capacity: dto.capacity,
          unit: dto.unit ?? (dto.type === 'PERSON' ? 'h/sem' : 'unités'),
        },
      });
      await this.cache.del(dashboardKey(workspaceId));
      return resource;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Une ressource porte déjà ce nom');
      }
      throw error;
    }
  }

  async remove(workspaceId: string, id: string) {
    await this.find(workspaceId, id);
    await this.prisma.resource.delete({ where: { id } });
    await this.cache.del(dashboardKey(workspaceId));
  }

  /**
   * Réserve une part de la ressource pour un projet sur une période.
   * Refusé si, un seul jour de la période, la charge dépasserait la capacité :
   * c'est la règle métier qui empêche de planifier quelqu'un à 150 %.
   */
  async allocate(workspaceId: string, resourceId: string, dto: CreateAllocationDto) {
    const resource = await this.find(workspaceId, resourceId);
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, workspaceId },
    });
    if (!project) throw new BadRequestException('Projet introuvable dans cet espace');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new BadRequestException('La fin de la période précède son début');
    }

    const existing = await this.prisma.allocation.findMany({
      where: { resourceId, startDate: { lte: end }, endDate: { gte: start } },
    });
    const peak = peakLoad([...existing, { startDate: start, endDate: end, amount: dto.amount }], start, end);
    if (peak > resource.capacity) {
      throw new ConflictException(
        `Surréservation : ${peak} ${resource.unit} demandés pour une capacité de ${resource.capacity} ${resource.unit} sur la période`,
      );
    }

    const allocation = await this.prisma.allocation.create({
      data: { resourceId, projectId: dto.projectId, amount: dto.amount, startDate: start, endDate: end },
      include: { project: { select: { id: true, name: true, color: true } } },
    });
    await this.cache.del(dashboardKey(workspaceId));
    return allocation;
  }

  async removeAllocation(workspaceId: string, allocationId: string) {
    const allocation = await this.prisma.allocation.findFirst({
      where: { id: allocationId, resource: { workspaceId } },
    });
    if (!allocation) throw new NotFoundException('Allocation introuvable');
    await this.prisma.allocation.delete({ where: { id: allocationId } });
    await this.cache.del(dashboardKey(workspaceId));
  }

  private async find(workspaceId: string, id: string) {
    const resource = await this.prisma.resource.findFirst({ where: { id, workspaceId } });
    if (!resource) throw new NotFoundException('Ressource introuvable');
    return resource;
  }
}
