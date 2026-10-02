import type { NextConfig } from 'next';

const config: NextConfig = {
  // Export en fichiers statiques : toute l'interface est rendue côté navigateur,
  // l'API NestJS les sert elle-même en production (une seule adresse).
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
