import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FlowDesk', template: '%s · FlowDesk' },
  description:
    'Plateforme SaaS de gestion de projets, de tâches, d’équipes et de ressources.',
};

export const viewport: Viewport = {
  themeColor: '#0a0b10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
