/** Clé du tableau de bord en cache, invalidée à chaque écriture dans l'espace. */
export const dashboardKey = (workspaceId: string) => `dashboard:${workspaceId}`;
