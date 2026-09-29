import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { Membership } from '@prisma/client';
import { AuthUser, CurrentMembership, CurrentUser, MinRole } from '../common/decorators';
import { WorkspaceGuard } from '../common/workspace.guard';
import { AddMemberDto, ChangeRoleDto, CreateWorkspaceDto } from './dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workspaces.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(user.id, dto);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceGuard)
  get(@Param('workspaceId') workspaceId: string, @CurrentMembership() membership: Membership) {
    return this.workspaces.get(workspaceId, membership);
  }

  @Get(':workspaceId/members')
  @UseGuards(WorkspaceGuard)
  members(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.members(workspaceId);
  }

  @Post(':workspaceId/members')
  @UseGuards(WorkspaceGuard)
  @MinRole('ADMIN')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentMembership() actor: Membership,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaces.addMember(workspaceId, actor, dto);
  }

  @Patch(':workspaceId/members/:membershipId')
  @UseGuards(WorkspaceGuard)
  @MinRole('OWNER')
  changeRole(
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.workspaces.changeRole(workspaceId, membershipId, dto);
  }

  @Delete(':workspaceId/members/:membershipId')
  @UseGuards(WorkspaceGuard)
  @MinRole('ADMIN')
  @HttpCode(204)
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
    @CurrentMembership() actor: Membership,
  ) {
    return this.workspaces.removeMember(workspaceId, membershipId, actor);
  }
}
