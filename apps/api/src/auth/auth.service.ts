import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { CacheService } from '../cache/cache.service';
import { slugify } from '../common/slug';
import { config } from '../config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto';
import { hashPassword, verifyPassword } from './password';
import { daysFromNow, hashToken, newRefreshToken } from './tokens';

export interface Session {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cache: CacheService,
  ) {}

  /** Crée le compte et son premier espace de travail, dont il devient propriétaire. */
  async register(dto: RegisterDto): Promise<Session> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }

    const passwordHash = await hashPassword(dto.password);
    const workspaceName = dto.workspaceName ?? `Espace de ${dto.name}`;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: dto.email, name: dto.name, passwordHash },
      });
      await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: slugify(workspaceName),
          members: { create: { userId: created.id, role: 'OWNER' } },
        },
      });
      return created;
    });

    return this.openSession(user.id, user.email);
  }

  async login(dto: LoginDto, ip: string): Promise<Session> {
    // Fenêtre de 60 s par couple IP + e-mail : ralentit la force brute sans
    // bloquer un autre utilisateur derrière la même adresse IP.
    const attemptsKey = `login:${ip}:${dto.email}`;
    const attempts = await this.cache.increment(attemptsKey, 60);
    if (attempts > config.loginAttempts) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans une minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Même message que l'e-mail existe ou non : on ne révèle pas quels comptes existent.
    const valid = user ? await verifyPassword(dto.password, user.passwordHash) : false;
    if (!user || !valid) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect');
    }

    await this.cache.del(attemptsKey);
    return this.openSession(user.id, user.email);
  }

  /**
   * Rotation du jeton de rafraîchissement : chaque utilisation le consomme et
   * en émet un nouveau dans la même famille. Si un jeton déjà consommé est
   * présenté à nouveau, c'est qu'il a été copié — toute la famille est révoquée
   * et l'utilisateur doit se reconnecter.
   */
  async refresh(token: string | undefined): Promise<Session> {
    if (!token) throw new UnauthorizedException('Session absente');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Session invalide');

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session révoquée, reconnectez-vous');
    }
    if (stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expirée');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.openSession(stored.user.id, stored.user.email, stored.familyId);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            workspace: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return {
      ...user,
      memberships: undefined,
      workspaces: user.memberships.map((m) => ({ ...m.workspace, role: m.role })),
    };
  }

  private async openSession(
    userId: string,
    email: string,
    familyId: string = randomUUID(),
  ): Promise<Session> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: config.jwtAccessSecret, expiresIn: config.accessTtl },
    );
    const refreshToken = newRefreshToken();
    const refreshExpiresAt = daysFromNow(config.refreshTtlDays);

    await this.prisma.refreshToken.create({
      data: { tokenHash: hashToken(refreshToken), familyId, userId, expiresAt: refreshExpiresAt },
    });
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
