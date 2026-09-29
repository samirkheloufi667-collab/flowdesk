/**
 * Tests de bout en bout : une vraie API NestJS contre un vrai PostgreSQL.
 *
 * La base PGlite en mémoire est démarrée par global-setup.mjs, migrations
 * comprises ; ce fichier interroge l'API par HTTP. Rien n'est simulé :
 * c'est la meilleure preuve que les règles de sécurité tiennent réellement.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configure } from '../src/main';

const PORT = 5544;

let app: INestApplication;
let http: ReturnType<typeof request>;

async function register(email: string, name = 'Test') {
  const res = await http.post('/api/auth/register').send({ email, name, password: 'motdepasse1' });
  expect(res.status).toBe(201);
  const me = await http.get('/api/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`);
  return { token: res.body.accessToken as string, workspaceId: me.body.workspaces[0].id as string, userId: me.body.id as string };
}

const cookieOf = (res: request.Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('fd_refresh='))!.split(';')[0];

beforeAll(async () => {
  process.env.DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?connection_limit=1&sslmode=disable`;
  process.env.JWT_ACCESS_SECRET = 'secret-de-test';
  delete process.env.REDIS_URL;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = configure(moduleRef.createNestApplication());
  await app.init();
  http = request(app.getHttpServer());
}, 60_000);

afterAll(async () => {
  await app?.close();
});

describe('santé et authentification', () => {
  it('la sonde de santé est publique', async () => {
    const res = await http.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up', cache: 'memory' });
  });

  it('une route protégée refuse une requête sans jeton', async () => {
    expect((await http.get('/api/workspaces')).status).toBe(401);
  });

  it("l'inscription crée un espace dont on devient propriétaire", async () => {
    const { token } = await register('proprio@test.dev', 'Proprio');
    const me = await http.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.workspaces).toHaveLength(1);
    expect(me.body.workspaces[0].role).toBe('OWNER');
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('refuse une seconde inscription avec le même e-mail', async () => {
    await register('doublon@test.dev');
    const res = await http
      .post('/api/auth/register')
      .send({ email: 'DOUBLON@test.dev', name: 'Xavier', password: 'motdepasse1' });
    expect(res.status).toBe(409);
  });

  it('donne le même message pour un e-mail inconnu et un mauvais mot de passe', async () => {
    await register('connu@test.dev');
    const inconnu = await http.post('/api/auth/login').send({ email: 'personne@test.dev', password: 'x' });
    const mauvais = await http.post('/api/auth/login').send({ email: 'connu@test.dev', password: 'x' });
    expect(inconnu.status).toBe(401);
    expect(mauvais.status).toBe(401);
    expect(inconnu.body.message).toBe(mauvais.body.message);
  });

  it('bloque la force brute au-delà de 5 tentatives par minute', async () => {
    await register('cible@test.dev');
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await http.post('/api/auth/login').send({ email: 'cible@test.dev', password: 'faux' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
    expect(statuses[5]).toBe(429);
  });
});

describe('rotation des jetons de rafraîchissement', () => {
  it('émet un nouveau jeton à chaque rafraîchissement', async () => {
    await register('rotation@test.dev');
    const login = await http.post('/api/auth/login').send({ email: 'rotation@test.dev', password: 'motdepasse1' });
    const first = cookieOf(login);
    const refreshed = await http.post('/api/auth/refresh').set('Cookie', first);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    expect(cookieOf(refreshed)).not.toBe(first);
  });

  it('révoque toute la session quand un ancien jeton est réutilisé', async () => {
    await register('vol@test.dev');
    const login = await http.post('/api/auth/login').send({ email: 'vol@test.dev', password: 'motdepasse1' });
    const stolen = cookieOf(login);

    const legit = await http.post('/api/auth/refresh').set('Cookie', stolen);
    const current = cookieOf(legit);

    // Le voleur rejoue l'ancien jeton : refusé…
    expect((await http.post('/api/auth/refresh').set('Cookie', stolen)).status).toBe(401);
    // …et le jeton légitime est révoqué avec lui : la session est coupée.
    expect((await http.post('/api/auth/refresh').set('Cookie', current)).status).toBe(401);
  });
});

describe('cloisonnement entre espaces', () => {
  let alice: Awaited<ReturnType<typeof register>>;
  let bob: Awaited<ReturnType<typeof register>>;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    alice = await register('alice@test.dev', 'Alice');
    bob = await register('bob@test.dev', 'Bob');
    const project = await http
      .post(`/api/workspaces/${alice.workspaceId}/projects`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Projet secret' });
    projectId = project.body.id;
    const task = await http
      .post(`/api/workspaces/${alice.workspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Tâche confidentielle' });
    taskId = task.body.id;
  });

  it("un étranger reçoit 404, pas 403, sur l'espace d'un autre", async () => {
    const res = await http
      .get(`/api/workspaces/${alice.workspaceId}/projects`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(res.status).toBe(404);
  });

  it("connaître l'identifiant d'une tâche ne suffit pas à la modifier depuis son propre espace", async () => {
    const res = await http
      .patch(`/api/workspaces/${bob.workspaceId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Piraté' });
    expect(res.status).toBe(404);

    const tasks = await http
      .get(`/api/workspaces/${alice.workspaceId}/projects/${projectId}/tasks`)
      .set('Authorization', `Bearer ${alice.token}`);
    expect(tasks.body[0].title).toBe('Tâche confidentielle');
  });

  it("un lecteur peut consulter mais pas créer", async () => {
    const added = await http
      .post(`/api/workspaces/${alice.workspaceId}/members`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ email: 'bob@test.dev', role: 'VIEWER' });
    expect(added.status).toBe(201);

    const read = await http
      .get(`/api/workspaces/${alice.workspaceId}/projects`)
      .set('Authorization', `Bearer ${bob.token}`);
    expect(read.status).toBe(200);

    const write = await http
      .post(`/api/workspaces/${alice.workspaceId}/projects`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ name: 'Tentative' });
    expect(write.status).toBe(403);
  });

  it("rejette un champ non prévu, comme une tentative d'élévation de rôle", async () => {
    const res = await http
      .post(`/api/workspaces/${alice.workspaceId}/projects`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ name: 'Projet', role: 'OWNER' });
    expect(res.status).toBe(400);
  });

  it("l'espace garde toujours au moins un propriétaire", async () => {
    const members = await http
      .get(`/api/workspaces/${alice.workspaceId}/members`)
      .set('Authorization', `Bearer ${alice.token}`);
    const owner = members.body.find((m: { role: string }) => m.role === 'OWNER');
    const res = await http
      .patch(`/api/workspaces/${alice.workspaceId}/members/${owner.id}`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ role: 'MEMBER' });
    expect(res.status).toBe(400);
  });
});

describe('ressources et tableau de bord', () => {
  it('refuse une allocation qui dépasserait la capacité', async () => {
    const { token, workspaceId } = await register('planif@test.dev');
    const auth = { Authorization: `Bearer ${token}` };
    const project = await http.post(`/api/workspaces/${workspaceId}/projects`).set(auth).send({ name: 'Chantier' });
    const resource = await http
      .post(`/api/workspaces/${workspaceId}/resources`)
      .set(auth)
      .send({ name: 'Développeuse', type: 'PERSON', capacity: 35 });

    const base = { projectId: project.body.id, startDate: '2026-11-01', endDate: '2026-11-30' };
    const ok = await http
      .post(`/api/workspaces/${workspaceId}/resources/${resource.body.id}/allocations`)
      .set(auth)
      .send({ ...base, amount: 30 });
    expect(ok.status).toBe(201);

    const trop = await http
      .post(`/api/workspaces/${workspaceId}/resources/${resource.body.id}/allocations`)
      .set(auth)
      .send({ ...base, startDate: '2026-11-20', endDate: '2026-12-10', amount: 10 });
    expect(trop.status).toBe(409);
    expect(trop.body.message).toContain('Surréservation');
  });

  it('met le tableau de bord en cache et l’invalide à chaque écriture', async () => {
    const { token, workspaceId } = await register('cache@test.dev');
    const auth = { Authorization: `Bearer ${token}` };

    const first = await http.get(`/api/workspaces/${workspaceId}/dashboard`).set(auth);
    const second = await http.get(`/api/workspaces/${workspaceId}/dashboard`).set(auth);
    expect(first.body.cache.hit).toBe(false);
    expect(second.body.cache.hit).toBe(true);

    await http.post(`/api/workspaces/${workspaceId}/projects`).set(auth).send({ name: 'Nouveau' });
    const third = await http.get(`/api/workspaces/${workspaceId}/dashboard`).set(auth);
    expect(third.body.cache.hit).toBe(false);
    expect(third.body.projects.total).toBe(1);
  });
});
