import { Body, Controller, Get, HttpCode, Ip, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { config } from '../config';
import { AuthService, Session } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

const REFRESH_COOKIE = 'fd_refresh';

/**
 * Le jeton d'accès est renvoyé dans le corps et gardé en mémoire par le
 * navigateur. Le jeton de rafraîchissement part dans un cookie httpOnly :
 * inaccessible au JavaScript de la page, donc hors de portée d'une faille XSS.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.register(dto));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(dto, ip));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private respond(res: Response, session: Session) {
    res.cookie(REFRESH_COOKIE, session.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.production,
      path: '/api/auth',
      expires: session.refreshExpiresAt,
    });
    return { accessToken: session.accessToken };
  }
}
