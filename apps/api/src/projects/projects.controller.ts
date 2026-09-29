import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../common/workspace.guard';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { ProjectsService } from './projects.service';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(WorkspaceGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Param('workspaceId') workspaceId: string) {
    return this.projects.list(workspaceId);
  }

  @Get(':id')
  get(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.projects.get(workspaceId, id);
  }

  @Post()
  @MinRole('ADMIN')
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateProjectDto) {
    return this.projects.create(workspaceId, dto);
  }

  @Patch(':id')
  @MinRole('ADMIN')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @MinRole('ADMIN')
  @HttpCode(204)
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.projects.remove(workspaceId, id);
  }
}
