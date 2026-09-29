import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { Public } from './common/decorators';
import { PrismaService } from './prisma/prisma.service';

/** Sonde de santé pour Docker et les répartiteurs de charge. */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Public()
  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unreachable' });
    }
    return { status: 'ok', database: 'up', cache: this.cache.backend };
  }
}
