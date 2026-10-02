import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FlowDesk', template: '%s · FlowDesk' },
  description: 'Plateforme SaaS de gestion de projets, de tâches, d’équipes et de ressources.',
};

export const viewport: Viewport = {
  themeColor: '#f3f0e8',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
