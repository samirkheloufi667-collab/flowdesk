import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../common/workspace.guard';
import { CreateTeamDto, SetTeamMembersDto, UpdateTeamDto } from './dto';
import { TeamsService } from './teams.service';

@Controller('workspaces/:workspaceId/teams')
@UseGuards(WorkspaceGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.teams.list(workspaceId);
  }

  @Post()
  @MinRole('ADMIN')
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateTeamDto) {
    return this.teams.create(workspaceId, dto);
  }

  @Patch(':id')
  @MinRole('ADMIN')
  update(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(workspaceId, id, dto);
  }

  @Put(':id/members')
  @MinRole('ADMIN')
  setMembers(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: SetTeamMembersDto,
  ) {
    return this.teams.setMembers(workspaceId, id, dto);
  }

  @Delete(':id')
  @MinRole('ADMIN')
  @HttpCode(204)
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.teams.remove(workspaceId, id);
  }
}
