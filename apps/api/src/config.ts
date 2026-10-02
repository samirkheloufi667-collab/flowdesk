function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

/** Configuration lue à la demande, une fois .env chargé. */
export const config = {
  get port() {
    return Number(process.env.PORT ?? 4000);
  },
  get webOrigin() {
    // Sur Render, l'interface est servie par l'API elle-même : même adresse.
    return process.env.WEB_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000';
  },
  get jwtAccessSecret() {
    return required('JWT_ACCESS_SECRET');
  },
  get production() {
    return process.env.NODE_ENV === 'production';
  },
  /** Durée de vie du jeton d'accès. Courte : c'est lui qui voyage à chaque requête. */
  accessTtl: '15m' as const,
  /** Durée de vie du jeton de rafraîchissement, en jours. */
  refreshTtlDays: 7,
  /** Tentatives de connexion autorisées par fenêtre de 60 secondes. */
  loginAttempts: 5,
};
