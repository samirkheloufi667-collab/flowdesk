import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { WorkspaceGuard } from '../common/workspace.guard';
import { DashboardService } from './dashboard.service';

@Controller('workspaces/:workspaceId/dashboard')
@UseGuards(WorkspaceGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  summary(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthUser) {
    return this.dashboard.summary(workspaceId, user.id);
  }
}
