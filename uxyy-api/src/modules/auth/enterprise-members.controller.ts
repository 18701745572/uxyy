import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { requireJwtUserId } from '../../common/utils/jwt-request-context';
import { PermissionsGuard } from './permissions.guard';
import { Permission } from './role-permissions';
import { EnterpriseInvitationsService } from './enterprise-invitations.service';
import {
  EnterpriseMemberAddDto,
  EnterpriseMemberUpdateRoleDto,
} from './dto/enterprise-members.dto';
import { EnterpriseMembersService } from './enterprise-members.service';

@ApiTags('enterprise')
@ApiBearerAuth()
@Controller('enterprise/members')
@UseGuards(PermissionsGuard)
@Permissions(Permission.SYS_MEMBER)
export class EnterpriseMembersController {
  constructor(
    private readonly service: EnterpriseMembersService,
    private readonly invitations: EnterpriseInvitationsService,
  ) {}

  private enterpriseIdFromRequest(req: Request): number {
    const user = req.user as Express.UserPayload | undefined;
    const eid = user?.enterpriseId;
    if (eid == null || Number.isNaN(Number(eid))) {
      throw new ForbiddenException('当前会话未绑定企业');
    }
    return eid;
  }

  @Get()
  @ApiOperation({ summary: '列出当前企业成员' })
  findAll(@Req() req: Request) {
    return this.service.listMembers(this.enterpriseIdFromRequest(req));
  }

  @Post()
  @ApiOperation({ summary: '将已注册用户手机号加入当前企业并分配角色' })
  add(@Req() req: Request, @Body() dto: EnterpriseMemberAddDto) {
    return this.service.addMember(
      this.enterpriseIdFromRequest(req),
      dto.phone,
      dto.role,
    );
  }

  @Post('invitations')
  @ApiOperation({
    summary: '生成邀请链接（/join?t=…）；未注册用户走受限注册，已注册用户登录后接受邀请',
  })
  createInvitation(
    @Req() req: Request,
    @Body() dto: EnterpriseMemberAddDto,
  ) {
    return this.invitations.createInvitation(
      this.enterpriseIdFromRequest(req),
      requireJwtUserId(req),
      dto.phone,
      dto.role,
    );
  }

  @Patch(':userId')
  @ApiOperation({ summary: '修改成员角色（finance/sales/warehouse/oa）' })
  patch(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: EnterpriseMemberUpdateRoleDto,
  ) {
    return this.service.updateMemberRole(
      this.enterpriseIdFromRequest(req),
      userId,
      dto.role,
    );
  }

  @Delete(':userId')
  @ApiOperation({ summary: '将成员移出企业（不可移除企业主）' })
  remove(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.service.removeMember(this.enterpriseIdFromRequest(req), userId);
  }
}
