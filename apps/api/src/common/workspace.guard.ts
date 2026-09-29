import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MIN_ROLE } from './decorators';
import { hasRole } from './roles';

/**
 * Vérifie, pour toute route /workspaces/:workspaceId/..., que l'utilisateur
 * appartient à l'espace et qu'il a le rôle requis.
 *
 * Un non-membre reçoit 404 et non 403 : répondre « interdit » confirmerait
 * que l'espace existe, ce qui renseigne un attaquant.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const workspaceId: string | undefined = request.params.workspaceId;
    if (!workspaceId) {
      throw new NotFoundException('Espace introuvable');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: request.user.id, workspaceId } },
    });
    if (!membership) {
      throw new NotFoundException('Espace introuvable');
    }

    const required =
      this.reflector.getAllAndOverride<Role>(MIN_ROLE, [ctx.getHandler(), ctx.getClass()]) ??
      'VIEWER';
    if (!hasRole(membership.role, required)) {
      throw new ForbiddenException(`Cette action demande le rôle ${required}`);
    }

    request.membership = membership;
    return true;
  }
}
