import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ResourcesModule } from './resources/resources.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    JwtModule.register({ global: true }),
    PrismaModule,
    CacheModule,
    AuthModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    TeamsModule,
    ResourcesModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  // Garde globale : chaque route exige un jeton, sauf celles marquées @Public().
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
