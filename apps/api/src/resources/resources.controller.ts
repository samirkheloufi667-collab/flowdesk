import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../common/workspace.guard';
import { CreateAllocationDto, CreateResourceDto } from './dto';
import { ResourcesService } from './resources.service';

@Controller('workspaces/:workspaceId')
@UseGuards(WorkspaceGuard)
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Get('resources')
  list(@Param('workspaceId') workspaceId: string) {
    return this.resources.list(workspaceId);
  }

  @Post('resources')
  @MinRole('ADMIN')
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateResourceDto) {
    return this.resources.create(workspaceId, dto);
  }

  @Delete('resources/:id')
  @MinRole('ADMIN')
  @HttpCode(204)
  remove(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.resources.remove(workspaceId, id);
  }

  @Post('resources/:id/allocations')
  @MinRole('ADMIN')
  allocate(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CreateAllocationDto,
  ) {
    return this.resources.allocate(workspaceId, id, dto);
  }

  @Delete('allocations/:id')
  @MinRole('ADMIN')
  @HttpCode(204)
  removeAllocation(@Param('workspaceId') workspaceId: string, @Param('id') id: string) {
    return this.resources.removeAllocation(workspaceId, id);
  }
}
