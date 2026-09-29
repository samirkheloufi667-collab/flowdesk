import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, SetTeamMembersDto, UpdateTeamDto } from './dto';

const teamInclude = {
  members: { select: { user: { select: { id: true, name: true, email: true } } } },
  _count: { select: { projects: true } },
} as const;

type TeamRow = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

const present = ({ members, _count, ...team }: TeamRow) => ({
  ...team,
  members: members.map((m) => m.user),
  projectCount: _count.projects,
});

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    const teams = await this.prisma.team.findMany({
      where: { workspaceId },
      include: teamInclude,
      orderBy: { name: 'asc' },
    });
    return teams.map(present);
  }

  async create(workspaceId: string, dto: CreateTeamDto) {
    try {
      const team = await this.prisma.team.create({
        data: { workspaceId, name: dto.name, color: dto.color },
        include: teamInclude,
      });
      return present(team);
    } catch (error) {
      throw this.duplicate(error);
    }
  }

  async update(workspaceId: string, id: string, dto: UpdateTeamDto) {
    await this.find(workspaceId, id);
    try {
      const team = await this.prisma.team.update({ where: { id }, data: dto, include: teamInclude });
      return present(team);
    } catch (error) {
      throw this.duplicate(error);
    }
  }

  async remove(workspaceId: string, id: string) {
    await this.find(workspaceId, id);
    await this.prisma.team.delete({ where: { id } });
  }

  /** Seuls des membres de l'espace peuvent entrer dans une de ses équipes. */
  async setMembers(workspaceId: string, id: string, dto: SetTeamMembersDto) {
    await this.find(workspaceId, id);
    const userIds = [...new Set(dto.userIds)];
    const valid = await this.prisma.membership.count({
      where: { workspaceId, userId: { in: userIds } },
    });
    if (valid !== userIds.length) {
      throw new BadRequestException("Certaines personnes ne sont pas membres de l'espace");
    }
    await this.prisma.$transaction([
      this.prisma.teamMember.deleteMany({ where: { teamId: id } }),
      this.prisma.teamMember.createMany({ data: userIds.map((userId) => ({ teamId: id, userId })) }),
    ]);
    const team = await this.prisma.team.findUniqueOrThrow({ where: { id }, include: teamInclude });
    return present(team);
  }

  private async find(workspaceId: string, id: string) {
    const team = await this.prisma.team.findFirst({ where: { id, workspaceId } });
    if (!team) throw new NotFoundException('Équipe introuvable');
    return team;
  }

  private duplicate(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Une équipe porte déjà ce nom');
    }
    return error;
  }
}
