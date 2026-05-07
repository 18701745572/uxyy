import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import type {
  RegisterDto,
  RefreshTokenDto,
  ResetPasswordDto,
} from './auth.service';

interface UserCtx {
  userId: number;
  enterpriseId?: number;
  role?: string;
}

function userFromRequest(req: Request): UserCtx | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const user = u as Record<string, unknown>;
  const userId =
    typeof user.userId === 'number' && !Number.isNaN(user.userId)
      ? user.userId
      : undefined;
  const enterpriseId =
    typeof user.enterpriseId === 'number' && !Number.isNaN(user.enterpriseId)
      ? user.enterpriseId
      : undefined;
  const role = typeof user.role === 'string' ? user.role : undefined;
  if (userId === undefined) return undefined;
  return { userId, enterpriseId, role };
}

function enterpriseIdOrThrow(req: Request): number {
  const ctx = userFromRequest(req);
  if (!ctx || ctx.enterpriseId == null) {
    throw new ForbiddenException('未绑定企业');
  }
  return ctx.enterpriseId;
}

function requireUserId(req: Request): number {
  const ctx = userFromRequest(req);
  if (!ctx?.userId) {
    throw new UnauthorizedException();
  }
  return ctx.userId;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登录' })
  login(@Body() dto: { phone: string; password: string }) {
    return this.auth.login(dto.phone, dto.password);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '注册' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshToken(dto.refresh_token);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重置密码' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  profile(@Req() req: Request) {
    return this.auth.getProfile(requireUserId(req));
  }

  @ApiBearerAuth()
  @Get('enterprises')
  @ApiOperation({ summary: '当前用户所属企业列表（含默认标记与行业）' })
  listEnterprises(@Req() req: Request) {
    return this.auth.listEnterprises(requireUserId(req));
  }

  @ApiBearerAuth()
  @Put('switch-enterprise/:id')
  @ApiOperation({ summary: '切换默认企业' })
  switchEnterprise(@Req() req: Request, @Param('id') enterpriseId: string) {
    return this.auth.switchEnterprise(
      requireUserId(req),
      parseInt(enterpriseId, 10),
    );
  }

  // ========== 审批流程 ==========

  @ApiBearerAuth()
  @Post('approval-flows')
  @ApiOperation({ summary: '创建审批流程' })
  createApprovalFlow(
    @Req() req: Request,
    @Body()
    dto: {
      name: string;
      type: string;
      steps: { step: number; role: string; condition?: object }[];
    },
  ) {
    const eid = enterpriseIdOrThrow(req);
    return this.auth.createApprovalFlow(dto, eid);
  }

  @ApiBearerAuth()
  @Get('approval-flows')
  @ApiOperation({ summary: '查询审批流程列表' })
  listApprovalFlows(
    @Req() req: Request,
    @Body() query: { page?: number; pageSize?: number; type?: string } = {},
  ) {
    const eid = enterpriseIdOrThrow(req);
    return this.auth.listApprovalFlows(eid, query);
  }

  @ApiBearerAuth()
  @Get('approval-flows/:id')
  @ApiOperation({ summary: '查询审批流程详情' })
  getApprovalFlow(@Req() req: Request, @Param('id') id: string) {
    const eid = enterpriseIdOrThrow(req);
    return this.auth.getApprovalFlow(parseInt(id, 10), eid);
  }

  // ========== 审批单 ==========

  @ApiBearerAuth()
  @Post('approvals')
  @ApiOperation({ summary: '提交审批单' })
  submitApproval(
    @Req() req: Request,
    @Body()
    dto: {
      flowId: number;
      businessType: string;
      businessId: number;
      title: string;
      remark?: string;
    },
  ) {
    return this.auth.submitApproval(dto, requireUserId(req));
  }

  @ApiBearerAuth()
  @Get('approvals')
  @ApiOperation({ summary: '查询审批单列表' })
  listApprovals(
    @Req() req: Request,
    @Body() query: { page?: number; pageSize?: number; status?: string } = {},
  ) {
    const eid = enterpriseIdOrThrow(req);
    return this.auth.listApprovals(eid, query);
  }

  @ApiBearerAuth()
  @Get('approvals/:id')
  @ApiOperation({ summary: '查询审批单详情' })
  getApproval(@Req() req: Request, @Param('id') id: string) {
    const eid = enterpriseIdOrThrow(req);
    return this.auth.getApproval(parseInt(id, 10), eid);
  }

  @ApiBearerAuth()
  @Put('approvals/:id/action')
  @ApiOperation({ summary: '审批操作（同意/驳回/取消）' })
  actionApproval(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: { action: string; comment?: string },
  ) {
    const ctx = userFromRequest(req);
    if (!ctx) throw new ForbiddenException('未认证');
    if (!ctx.role) throw new ForbiddenException('无角色信息');
    return this.auth.actionApproval(
      parseInt(id, 10),
      ctx.userId,
      ctx.role,
      dto,
    );
  }
}
