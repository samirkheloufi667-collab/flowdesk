import './env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { join, sep } from 'node:path';
import { AppModule } from './app.module';
import { config } from './config';

export function configure(app: import('@nestjs/common').INestApplication) {
  app.setGlobalPrefix('api');
  // Derrière le proxy de l'hébergeur, l'adresse IP réelle est dans X-Forwarded-For (limiteur de connexions).
  if (config.production) app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // L'export statique de Next.js place de petits scripts dans chaque page.
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  // Production : l'API sert aussi l'interface exportée en fichiers statiques.
  const webDist = process.env.WEB_DIST;
  if (webDist) {
    // Les fichiers de _next/static ont une empreinte dans leur nom : on peut les
    // garder un an. Les pages HTML, elles, doivent être revalidées à chaque visite,
    // sinon une ancienne page en cache réclame des scripts qui n'existent plus.
    app.use(
      express.static(webDist, {
        setHeaders: (res, path) => {
          const hashed = path.includes(`${sep}_next${sep}static${sep}`);
          res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      }),
    );
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.status(404).sendFile(join(webDist, '404.html'));
    });
  }
  app.use(cookieParser());
  app.enableCors({ origin: config.webOrigin, credentials: true });
  // whitelist : tout champ non déclaré dans un DTO est rejeté, ce qui empêche
  // par exemple d'envoyer { "role": "OWNER" } dans une requête qui ne l'attend pas.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.enableShutdownHooks();
  return app;
}

async function bootstrap() {
  const app = configure(await NestFactory.create(AppModule));
  await app.listen(config.port);
  new Logger('FlowDesk').log(`API prête sur http://localhost:${config.port}/api`);
}

if (require.main === module) {
  void bootstrap();
}
