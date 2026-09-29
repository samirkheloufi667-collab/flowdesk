/**
 * Données de démonstration : une agence fictive, « Studio Nova », avec cinq
 * personnes aux rôles différents pour pouvoir tester les permissions.
 *
 *   npm run prisma:seed
 *
 * Tous les comptes ont le mot de passe « demo1234 ».
 * Les dates sont calculées par rapport à aujourd'hui : la démo reste vivante.
 */
import { Priority, PrismaClient, ProjectStatus, Role, TaskStatus } from '@prisma/client';
import { hashPassword } from '../src/auth/password';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);

const PEOPLE: Array<{ key: string; name: string; email: string; role: Role }> = [
  { key: 'lea', name: 'Léa Martin', email: 'demo@flowdesk.dev', role: 'OWNER' },
  { key: 'karim', name: 'Karim Benali', email: 'karim@flowdesk.dev', role: 'ADMIN' },
  { key: 'sofia', name: 'Sofia Rossi', email: 'sofia@flowdesk.dev', role: 'MEMBER' },
  { key: 'hugo', name: 'Hugo Lefèvre', email: 'hugo@flowdesk.dev', role: 'MEMBER' },
  { key: 'nadia', name: 'Nadia Haddad', email: 'client@flowdesk.dev', role: 'VIEWER' },
];

type TaskSeed = [title: string, status: TaskStatus, priority: Priority, assignee: string | null, dueIn: number | null, estimate?: number];

const PROJECTS: Array<{
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  team: string;
  start: number;
  due: number;
  tasks: TaskSeed[];
}> = [
  {
    name: "Refonte de l'application mobile",
    description: 'Nouvelle navigation, mode sombre et parcours d’inscription raccourci de 5 à 2 écrans.',
    status: 'ACTIVE',
    color: '#ec4899',
    team: 'Design',
    start: -30,
    due: 45,
    tasks: [
      ['Audit UX de l’existant', 'DONE', 'HIGH', 'sofia', -20, 8],
      ['Maquettes du nouveau parcours d’inscription', 'DONE', 'HIGH', 'sofia', -8, 16],
      ['Système de design : tokens de couleur', 'REVIEW', 'MEDIUM', 'sofia', 3, 6],
      ['Mode sombre sur les écrans principaux', 'IN_PROGRESS', 'MEDIUM', 'hugo', 10, 12],
      ['Tests utilisateurs avec 8 participants', 'TODO', 'HIGH', 'karim', 18, 10],
      ['Animation de l’écran d’accueil', 'TODO', 'LOW', 'hugo', 30, 4],
    ],
  },
  {
    name: 'API de paiement v2',
    description: 'Paiements fractionnés, webhooks signés et idempotence des requêtes.',
    status: 'ACTIVE',
    color: '#6366f1',
    team: 'Plateforme',
    start: -21,
    due: 20,
    tasks: [
      ['Spécification des webhooks signés', 'DONE', 'URGENT', 'karim', -14, 6],
      ['Clés d’idempotence sur POST /payments', 'DONE', 'URGENT', 'karim', -5, 8],
      ['Paiement en trois fois', 'IN_PROGRESS', 'HIGH', 'hugo', 6, 20],
      ['Rejeu automatique des webhooks échoués', 'IN_PROGRESS', 'HIGH', 'karim', -2, 10],
      ['Documentation publique de l’API', 'TODO', 'MEDIUM', 'sofia', 15, 6],
      ['Test de charge : 500 paiements par seconde', 'TODO', 'HIGH', null, 12, 8],
      ['Revue de sécurité externe', 'TODO', 'URGENT', null, 18, 4],
    ],
  },
  {
    name: 'Tableau de bord client',
    description: 'Espace où chaque client suit l’avancement de ses projets et télécharge ses livrables.',
    status: 'ACTIVE',
    color: '#10b981',
    team: 'Produit',
    start: -10,
    due: 60,
    tasks: [
      ['Entretiens avec cinq clients', 'DONE', 'MEDIUM', 'karim', -4, 6],
      ['Choix des indicateurs affichés', 'REVIEW', 'MEDIUM', 'lea', 2, 3],
      ['Prototype interactif', 'IN_PROGRESS', 'HIGH', 'sofia', 9, 14],
      ['Export PDF des rapports', 'TODO', 'LOW', 'hugo', 40, 8],
      ['Notifications par e-mail', 'TODO', 'MEDIUM', null, 35, 6],
    ],
  },
  {
    name: 'Migration vers PostgreSQL 16',
    description: 'Montée de version de la base de production, sans interruption de service.',
    status: 'COMPLETED',
    color: '#0ea5e9',
    team: 'Plateforme',
    start: -60,
    due: -12,
    tasks: [
      ['Répétition de la migration sur une copie', 'DONE', 'HIGH', 'karim', -30, 6],
      ['Réplication logique vers la nouvelle instance', 'DONE', 'URGENT', 'hugo', -18, 10],
      ['Bascule et vérifications', 'DONE', 'URGENT', 'karim', -12, 4],
    ],
  },
  {
    name: 'Site vitrine 2027',
    description: 'Refonte du site public, prévue pour le premier trimestre.',
    status: 'PLANNED',
    color: '#f59e0b',
    team: 'Design',
    start: 30,
    due: 120,
    tasks: [
      ['Brief et arborescence', 'TODO', 'MEDIUM', 'lea', 35, 4],
      ['Direction artistique', 'TODO', 'MEDIUM', 'sofia', 50, 12],
    ],
  },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Le jeu de démonstration efface la base : refusé en production.');
  }

  console.log('Nettoyage de la base…');
  await prisma.$transaction([
    prisma.allocation.deleteMany(),
    prisma.task.deleteMany(),
    prisma.teamMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.team.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.workspace.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hashPassword('demo1234');
  const users: Record<string, string> = {};
  for (const person of PEOPLE) {
    const user = await prisma.user.create({
      data: { name: person.name, email: person.email, passwordHash },
    });
    users[person.key] = user.id;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Studio Nova',
      slug: 'studio-nova',
      members: { create: PEOPLE.map((p) => ({ userId: users[p.key], role: p.role })) },
    },
  });

  const teamDefs = [
    { name: 'Produit', color: '#10b981', members: ['lea', 'karim'] },
    { name: 'Design', color: '#ec4899', members: ['sofia', 'hugo'] },
    { name: 'Plateforme', color: '#6366f1', members: ['karim', 'hugo'] },
  ];
  const teams: Record<string, string> = {};
  for (const def of teamDefs) {
    const team = await prisma.team.create({
      data: {
        workspaceId: workspace.id,
        name: def.name,
        color: def.color,
        members: { create: def.members.map((k) => ({ userId: users[k] })) },
      },
    });
    teams[def.name] = team.id;
  }

  const projects: Record<string, string> = {};
  let taskCount = 0;
  for (const def of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        teamId: teams[def.team],
        name: def.name,
        description: def.description,
        status: def.status,
        color: def.color,
        startDate: inDays(def.start),
        dueDate: inDays(def.due),
      },
    });
    projects[def.name] = project.id;

    const perColumn: Partial<Record<TaskStatus, number>> = {};
    for (const [title, status, priority, assignee, dueIn, estimate] of def.tasks) {
      perColumn[status] = (perColumn[status] ?? 0) + 1;
      await prisma.task.create({
        data: {
          projectId: project.id,
          creatorId: users.lea,
          title,
          status,
          priority,
          assigneeId: assignee ? users[assignee] : null,
          dueDate: dueIn === null ? null : inDays(dueIn),
          estimate,
          position: perColumn[status]! * 1024,
        },
      });
      taskCount++;
    }
  }

  const resourceDefs = [
    { name: 'Karim Benali', type: 'PERSON' as const, capacity: 35, unit: 'h/sem' },
    { name: 'Sofia Rossi', type: 'PERSON' as const, capacity: 35, unit: 'h/sem' },
    { name: 'Hugo Lefèvre', type: 'PERSON' as const, capacity: 28, unit: 'h/sem' },
    { name: 'Salle Atlas', type: 'ROOM' as const, capacity: 10, unit: 'créneaux/sem' },
    { name: 'Serveur de préproduction', type: 'EQUIPMENT' as const, capacity: 2, unit: 'instances' },
  ];
  const resources: Record<string, string> = {};
  for (const def of resourceDefs) {
    const r = await prisma.resource.create({ data: { workspaceId: workspace.id, ...def } });
    resources[def.name] = r.id;
  }

  // Charges cohérentes avec la règle anti-surréservation : Karim est à 100 %.
  const allocations: Array<[resource: string, project: string, amount: number, from: number, to: number]> = [
    ['Karim Benali', 'API de paiement v2', 25, -21, 20],
    ['Karim Benali', 'Tableau de bord client', 10, -10, 30],
    ['Sofia Rossi', "Refonte de l'application mobile", 20, -30, 45],
    ['Sofia Rossi', 'Tableau de bord client', 8, -10, 60],
    ['Hugo Lefèvre', 'API de paiement v2', 16, -21, 20],
    ['Hugo Lefèvre', "Refonte de l'application mobile", 8, -5, 45],
    ['Salle Atlas', "Refonte de l'application mobile", 4, 0, 30],
    ['Serveur de préproduction', 'API de paiement v2', 1, -21, 20],
  ];
  for (const [resource, project, amount, from, to] of allocations) {
    await prisma.allocation.create({
      data: {
        resourceId: resources[resource],
        projectId: projects[project],
        amount,
        startDate: inDays(from),
        endDate: inDays(to),
      },
    });
  }

  console.log(
    `Studio Nova : ${PEOPLE.length} personnes, ${teamDefs.length} équipes, ${PROJECTS.length} projets, ` +
      `${taskCount} tâches, ${resourceDefs.length} ressources, ${allocations.length} allocations.`,
  );
  console.log('Connexion : demo@flowdesk.dev / demo1234 (propriétaire)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
