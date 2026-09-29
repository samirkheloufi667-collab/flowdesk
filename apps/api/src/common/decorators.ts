import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Membership, Role } from '@prisma/client';

export const IS_PUBLIC = 'isPublic';
export const MIN_ROLE = 'minRole';

/** Route accessible sans jeton (inscription, connexion, santé). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Rôle minimal requis dans l'espace de travail pour appeler la route. */
export const MinRole = (role: Role) => SetMetadata(MIN_ROLE, role);

export interface AuthUser {
  id: string;
  email: string;
}

/** Utilisateur authentifié, déposé sur la requête par JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

/** Appartenance à l'espace courant, déposée par WorkspaceGuard. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Membership => ctx.switchToHttp().getRequest().membership,
);
