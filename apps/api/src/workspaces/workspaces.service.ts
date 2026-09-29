import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Membership } from '@prisma/client';
import { hasRole } from '../common/roles';
import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto, ChangeRoleDto, CreateWorkspaceDto } from './dto';

const memberSelect = {
  id: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        workspace: { include: { _count: { select: { members: true, projects: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      members: m.workspace._count.members,
      projects: m.workspace._count.projects,
    }));
  }

  create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug: slugify(dto.name),
        members: { create: { userId, role: 'OWNER' } },
      },
    });
  }

  async get(workspaceId: string, membership: Membership) {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    return { ...workspace, role: membership.role };
  }

  members(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId },
      select: memberSelect,
      orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async addMember(workspaceId: string, actor: Membership, dto: AddMemberDto) {
    // On ne peut pas donner plus de droits qu'on en a soi-même.
    if (!hasRole(actor.role, dto.role)) {
      throw new ForbiddenException(`Vous ne pouvez pas attribuer le rôle ${dto.role}`);
    }
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new NotFoundException("Aucun compte FlowDesk n'utilise cet e-mail");
    }
    const already = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    });
    if (already) {
      throw new ConflictException('Cette personne est déjà membre de l’espace');
    }
    return this.prisma.membership.create({
      data: { workspaceId, userId: user.id, role: dto.role },
      select: memberSelect,
    });
  }

  async changeRole(workspaceId: string, membershipId: string, dto: ChangeRoleDto) {
    const target = await this.findMember(workspaceId, membershipId);
    if (target.role === 'OWNER' && dto.role !== 'OWNER') {
      await this.assertNotLastOwner(workspaceId);
    }
    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: dto.role },
      select: memberSelect,
    });
  }

  async removeMember(workspaceId: string, membershipId: string, actor: Membership) {
    const target = await this.findMember(workspaceId, membershipId);
    if (target.role === 'OWNER') {
      if (actor.role !== 'OWNER') {
        throw new ForbiddenException('Seul un propriétaire peut retirer un propriétaire');
      }
      await this.assertNotLastOwner(workspaceId);
    }
    await this.prisma.membership.delete({ where: { id: membershipId } });
  }

  private async findMember(workspaceId: string, membershipId: string) {
    const member = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });
    if (!member) throw new NotFoundException('Membre introuvable');
    return member;
  }

  /** Un espace sans propriétaire deviendrait impossible à administrer. */
  private async assertNotLastOwner(workspaceId: string) {
    const owners = await this.prisma.membership.count({ where: { workspaceId, role: 'OWNER' } });
    if (owners <= 1) {
      throw new BadRequestException('L’espace doit garder au moins un propriétaire');
    }
  }
}
