import type { NextConfig } from 'next';

const config: NextConfig = {
  // Image autonome pour Docker : n'embarque que ce qui est nécessaire à l'exécution.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default config;
