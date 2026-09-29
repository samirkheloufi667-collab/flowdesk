import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { config } from '../config';
import { IS_PUBLIC } from './decorators';

interface AccessPayload {
  sub: string;
  email: string;
}

/**
 * Garde globale : toute route exige un jeton d'accès valide, sauf celles
 * marquées @Public(). Protéger par défaut est plus sûr que d'avoir à penser
 * à protéger chaque nouvelle route.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest();
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authentification requise');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: config.jwtAccessSecret,
      });
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Session expirée ou invalide');
    }
  }
}
