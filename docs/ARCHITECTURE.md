# Architecture de FlowDesk

Ce document explique **pourquoi** le code est construit ainsi. Chaque section
répond à une question qu'on peut poser en entretien.

## Vue d'ensemble

```
Navigateur ──► Next.js (apps/web)          interface, rendu côté client
     │
     └──────► NestJS  (apps/api)  /api/*   règles métier, sécurité
                 ├── Prisma ──► PostgreSQL données
                 └── ioredis ─► Redis      cache + compteurs de tentatives
```

Monorepo npm (workspaces) : un seul `npm install`, deux applications
indépendantes, chacune avec son Dockerfile.

## Modèle de données

`User` ←→ `Workspace` via `Membership` (qui porte le **rôle**). Tout le reste
appartient à un espace : `Team`, `Project`, `Task`, `Resource`, `Allocation`.
Un utilisateur peut donc être propriétaire d'un espace et simple lecteur d'un
autre. `RefreshToken` stocke l'empreinte des jetons de session.

Schéma complet : `apps/api/prisma/schema.prisma` ; migration :
`apps/api/prisma/migrations/`.

## Authentification

| Élément | Choix | Raison |
|---|---|---|
| Mot de passe | `scrypt` (module `crypto` de Node), sel aléatoire, comparaison `timingSafeEqual` | fonction lente conçue pour les mots de passe, sans dépendance native à compiler |
| Jeton d'accès | JWT signé, **15 min**, gardé **en mémoire** côté navigateur | un script injecté ne peut pas le lire dans `localStorage` ; sa courte durée limite l'impact d'un vol |
| Jeton de rafraîchissement | 48 octets aléatoires en cookie **httpOnly**, `SameSite=Lax`, limité au chemin `/api/auth` ; seule son **empreinte SHA-256** est en base | une fuite de la base ne donne pas de sessions utilisables |
| Rotation | chaque rafraîchissement révoque l'ancien jeton et en émet un nouveau de la même « famille » | si un **ancien** jeton est présenté, c'est qu'il a été copié : toute la famille est révoquée et l'utilisateur doit se reconnecter |
| Force brute | 5 tentatives par minute par couple IP + e-mail (compteur Redis) | ralentit un attaquant sans bloquer le vrai propriétaire du compte ailleurs |
| Messages d'erreur | identiques pour « e-mail inconnu » et « mauvais mot de passe » | ne révèle pas quels e-mails ont un compte |

Côté interface (`apps/web/src/lib/api.ts`), les rafraîchissements simultanés
partagent **une seule promesse** : sinon deux onglets de requêtes enverraient le
même cookie deux fois, ce que la détection de réutilisation prendrait pour un vol.

## Permissions

Deux gardes NestJS, appliquées dans cet ordre :

1. `JwtAuthGuard` (global) : toute route exige un jeton, sauf celles marquées `@Public()`.
2. `WorkspaceGuard` : lit `:workspaceId` dans l'URL, charge l'adhésion de
   l'utilisateur et compare son rôle au minimum demandé par `@MinRole(...)`
   (`VIEWER < MEMBER < ADMIN < OWNER`).

Choix importants :

- **404 et non 403** pour un espace dont on n'est pas membre : un 403 confirmerait
  que l'espace existe.
- **Cloisonnement dans chaque requête** : les services filtrent toujours par
  `workspaceId`. Connaître l'identifiant d'une tâche d'un autre espace ne suffit
  donc pas à la lire ou la modifier (protection contre les IDOR) — un test de
  bout en bout le vérifie.
- **Validation stricte** : `ValidationPipe` avec `whitelist` et
  `forbidNonWhitelisted`. Envoyer `{ "role": "OWNER" }` dans un champ non prévu
  renvoie 400 au lieu d'être ignoré en silence.
- On ne peut pas attribuer un rôle supérieur au sien, et un espace garde
  toujours au moins un propriétaire.

L'interface reprend les mêmes règles (`can()` dans `lib/format.ts`) pour masquer
les boutons inutiles, mais **la sécurité est côté serveur** : l'interface n'est
qu'un confort.

## Ordre des cartes du Kanban

Chaque tâche a une `position` décimale. Déposer une carte entre deux autres lui
donne la **moyenne** de leurs positions : une seule ligne modifiée en base, au
lieu de renuméroter toute la colonne.

Après de nombreux déplacements au même endroit, l'écart entre deux positions
peut devenir minuscule. Sous `1e-6`, la colonne est renumérotée (pas de 1024)
dans une transaction. C'est rare, et le coût est payé seulement à ce moment-là.

Côté interface (`components/kanban.tsx`), le déplacement est appliqué
**immédiatement** (mise à jour optimiste), puis confirmé par le serveur ; en cas
d'erreur, la liste est rechargée. Le glisser-déposer (dnd-kit) fonctionne à la
souris, au doigt (appui long de 180 ms pour ne pas gêner le défilement) et au
clavier.

## Refus de la surréservation

Une ressource a une capacité (par exemple 35 h/semaine). Une nouvelle
allocation est refusée si, **un seul jour** de sa période, la somme des
allocations dépasse cette capacité.

Algorithme (`apps/api/src/resources/capacity.ts`), dit « de balayage » :

1. chaque allocation donne deux événements : `+quantité` à son début,
   `−quantité` le lendemain de sa fin ;
2. on trie les événements par date ;
3. on les parcourt en cumulant : le maximum atteint est la charge de pointe.

Complexité O(n log n) au lieu de tester chaque jour de chaque période. Le
serveur répond 409 avec un message explicite, affiché tel quel dans le
formulaire.

## Cache du tableau de bord

Le tableau de bord agrège plusieurs requêtes. Il est mis en cache **60 s par
espace** (`dashboard:<workspaceId>`) et **invalidé à chaque écriture** (tâche,
projet, ressource…), donc jamais périmé après une modification. La partie
personnelle (« assignées à moi ») est calculée à part pour ne pas mélanger les
utilisateurs dans une même entrée de cache.

Redis est facultatif : sans `REDIS_URL`, `CacheService` utilise une `Map` en
mémoire avec la même interface. Pratique en développement, mais en production à
plusieurs instances il faut Redis pour que le cache et les compteurs de
tentatives soient partagés.

## Interface

- Next.js 15 (App Router), React 19, Tailwind CSS 4 (jetons de couleur dans
  `globals.css`), polices Geist.
- Composants animés de [React Bits](https://reactbits.dev) : fond `Aurora`,
  cartes `SpotlightCard`, compteurs `CountUp`, titres `SplitText` et `ShinyText`.
  Les transitions CSS sont réduites si le système demande moins de mouvement.
- Responsive : barre latérale sur ordinateur, tiroir sur mobile ; le Kanban
  défile horizontalement colonne par colonne sur petit écran.
- `useApi` (lib/use-api.ts) : chargement, erreur et rechargement d'une ressource,
  sans bibliothèque supplémentaire.

## Base locale sans Docker

`npm run db:local` lance **PGlite**, un vrai PostgreSQL compilé en WebAssembly,
exposé sur le port 5433. Prisma s'y connecte comme à n'importe quel PostgreSQL.
PGlite exécute une seule requête à la fois (le serveur les met en file, sans
mélanger deux transactions) : l'URL contient donc `connection_limit=1`, et
`db:setup` ouvre une session neuve pour les migrations puis une autre pour les
données de démo. Le serveur local accepte malgré tout plusieurs connexions :
limité à une seule, il refusait la reconnexion de Prisma après une coupure, et
l'API perdait la base jusqu'au redémarrage. Avec `docker compose`, c'est un
PostgreSQL 16 classique.

## Tests

- **Unitaires** (`src/**/*.spec.ts`) : algorithme de capacité, hachage des mots
  de passe, hiérarchie des rôles, génération des slugs.
- **Bout en bout** (`test/app.e2e-spec.ts`) : l'application NestJS complète
  contre une vraie base PostgreSQL en mémoire, avec supertest. Ils couvrent les
  scénarios de sécurité listés plus haut.

## Limites connues et suites possibles

- Pas d'invitation par e-mail : on ajoute un membre qui a déjà un compte.
- Pas de temps réel : un autre utilisateur voit les changements au rechargement
  (piste : WebSocket ou Server-Sent Events par espace).
- Pas de pièces jointes ni de commentaires sur les tâches.
- Déploiement AWS envisagé : images Docker sur ECS Fargate, RDS PostgreSQL,
  ElastiCache Redis — non réalisé dans ce dépôt.
