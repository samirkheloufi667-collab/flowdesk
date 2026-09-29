import type { Role } from '@prisma/client';

/**
 * Les rôles sont hiérarchiques : un ADMIN peut tout ce que peut un MEMBER.
 * Vérifier un rang plutôt qu'une liste de rôles autorisés évite d'oublier
 * un rôle supérieur quand on protège une route.
 */
export const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
