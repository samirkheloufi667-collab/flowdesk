import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../common/workspace.guard';
import { CreateTaskDto, MoveTaskDto, UpdateTaskDto } from './dto';
import { TasksService } from './tasks.service';

@Controller('workspaces/:workspaceId')
@UseGuards(WorkspaceGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:projectId/tasks')
  list(@Param('workspaceId') workspaceId: string, @Param('projectId') projectId: string) {
    return this.tasks.listForProject(workspaceId, projectId);
  }

  @Get('tasks/mine')
  mine(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthUser) {
    return this.tasks.mine(workspaceId, user.id);
  }

  @Post('projects/:projectId/tasks')
  @MinRole('MEMBER')
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(workspaceId, projectId, user.id, dto);
  }

  @Patch('tasks/:id')
  @MinRole('MEMBER')
  update(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(workspaceId, id, dto);
  }

  @Patch('tasks/:id/move')
  @MinRole('MEMBER')
  move(@Param('workspaceId') workspaceId: string, @Param('id') id: string, @Body() dto: MoveTaskDto) {
    return this.tasks.move(workspaceId, id, dto);
  }

  @Delete('tasks/:id')
  @MinRole('MEMBER')
  @HttpCode(204)
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.tasks.remove(workspaceId, id);
  }
}
