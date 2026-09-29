# FlowDesk

Plateforme SaaS de gestion de projets, de tâches, d'équipes et de ressources.
Un espace de travail par organisation, des tableaux Kanban, des rôles qui décident
de qui voit et modifie quoi, et une planification des ressources qui **refuse la
surréservation**.

> Projet de portfolio full stack — Next.js · TypeScript · NestJS · PostgreSQL · Prisma · Redis · Docker

## Fonctionnalités

| | |
|---|---|
| **Espaces de travail** | Chaque organisation a son espace ; un utilisateur peut appartenir à plusieurs et passer de l'un à l'autre. |
| **Rôles** | Propriétaire, administrateur, membre, lecteur. L'interface masque ce qu'on ne peut pas faire, **l'API le refuse** de toute façon. |
| **Projets et Kanban** | Glisser-déposer entre colonnes (souris, tactile et clavier), mise à jour optimiste, priorités, échéances, estimations. |
| **Mes tâches** | Les tâches qui me sont assignées, classées par urgence (en retard, cette semaine, plus tard). |
| **Équipes** | Regroupement des membres par pôle, projets rattachés à une équipe. |
| **Ressources** | Personnes, salles, matériel : capacité, allocations par projet et par période, refus de toute réservation qui dépasserait la capacité, même un seul jour. |
| **Tableau de bord** | Avancement, retards, charge des ressources — calculé côté serveur et mis en cache (Redis). |
| **Sécurité** | JWT d'accès court en mémoire, jeton de rafraîchissement en cookie httpOnly avec rotation et détection de réutilisation, limitation des tentatives de connexion, cloisonnement strict entre espaces. |

## Démarrage rapide

Prérequis : Node.js 20 ou plus.

### Option 1 — avec Docker (environnement complet)

```bash
docker compose up --build
docker compose exec -e NODE_ENV=development api npx tsx prisma/seed.ts   # données de démo
```

Interface : http://localhost:3000 · API : http://localhost:4000/api

### Option 2 — sans Docker

Une base PostgreSQL embarquée (PGlite) remplace le serveur PostgreSQL ; Redis est
facultatif (le cache passe en mémoire).

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:setup      # migrations + données de démo
npm run db:local      # laisse tourner la base (terminal 1)
npm run dev:api       # API sur :4000 (terminal 2)
npm run dev:web       # interface sur :3000 (terminal 3)
```

### Comptes de démonstration

Mot de passe commun : `demo1234`

| E-mail | Rôle | Ce qu'on peut tester |
|---|---|---|
| `demo@flowdesk.dev` | Propriétaire | tout, dont la gestion des rôles |
| `client@flowdesk.dev` | Lecteur | consultation seule : aucun bouton de modification, et l'API renvoie 403 |

Le bouton « Essayer la démo » de la page d'accueil pré-remplit le premier compte.

## Tests

```bash
npm test            # tests unitaires (capacité, mots de passe, rôles, slugs)
npm run test:e2e    # tests de bout en bout de l'API sur une vraie base PostgreSQL en mémoire
```

Les tests de bout en bout vérifient notamment : la rotation des jetons et la
révocation d'une session volée, la limitation de la force brute, qu'un étranger
reçoit 404 (et non 403) sur l'espace d'un autre, qu'un identifiant de tâche
connu ne suffit pas à la modifier depuis un autre espace, le refus de la
surréservation et l'invalidation du cache.

## Structure

```
apps/
  api/   NestJS 11 + Prisma 6 (PostgreSQL) + Redis (ioredis)
  web/   Next.js 15 (App Router) + React 19 + Tailwind CSS 4
docs/
  ARCHITECTURE.md   choix techniques et leurs raisons
docker-compose.yml  PostgreSQL, Redis, API, interface
```

Le détail des choix (authentification, permissions, algorithme de capacité,
ordre des cartes du Kanban, cache) est dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Crédits

Les composants animés de l'interface (Aurora, SpotlightCard, CountUp, ShinyText,
SplitText) viennent de [React Bits](https://reactbits.dev) ; leur provenance est
indiquée en tête de chaque fichier de `apps/web/src/components/reactbits/`.
