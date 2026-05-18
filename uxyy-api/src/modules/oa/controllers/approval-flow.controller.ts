import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import { ApprovalFlowService } from '../services/approval-flow.service';
import {
  ApprovalActionDto,
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
} from '../dtos/approval-flow.dto';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@ApiTags('OA · 审批流程')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: '未登录或 token 无效' })
@ApiForbiddenResponse({
  description:
    '缺少所需权限（见各接口说明，需 oa:read / oa:manage / oa:approve 之一）',
})
@Controller('oa/approval-flows')
@UseGuards(PermissionsGuard)
export class ApprovalFlowController {
  constructor(private readonly service: ApprovalFlowService) {}

  @Post()
  @Permissions(Permission.OA_MANAGE)
  @ApiOperation({
    summary: '创建审批流程定义',
    description:
      '需 **`oa:manage`**。同一企业可按业务类型配置多条流程；步骤中 `role` 为企业角色码。',
  })
  @ApiBody({ type: CreateApprovalFlowDto })
  create(
    @Body() dto: CreateApprovalFlowDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.createFlow(req.user.enterpriseId, dto);
  }

  @Get()
  @Permissions(Permission.OA_MANAGE)
  @ApiOperation({
    summary: '审批流程列表',
    description:
      '需 **`oa:manage`**。返回本企业全部流程定义（含 `steps` JSON）。',
  })
  findAll(@Req() req: Request & { user: UserContext }) {
    return this.service.findAllFlows(req.user.enterpriseId);
  }

  /** 静态路径须放在 :id 之前，避免被 ParseIntPipe 抢占 */
  @Get('pending/list')
  @Permissions(Permission.OA_APPROVE)
  @ApiOperation({
    summary: '待我审批的实例列表',
    description:
      '需 **`oa:approve`**。与流程记录联表查询，当前为简化实现，后续可按 `role` / 步骤过滤。',
  })
  getPendingApprovals(@Req() req: Request & { user: UserContext }) {
    return this.service.getPendingApprovals(
      req.user.role || '',
      req.user.enterpriseId,
    );
  }

  @Get('my/records')
  @Permissions(Permission.OA_READ)
  @ApiOperation({
    summary: '我提交的审批记录',
    description:
      '需 **`oa:read`**（各业务角色通常具备，用于查看本人发起的审批）。',
  })
  getMyApprovals(@Req() req: Request & { user: UserContext }) {
    return this.service.getMyApprovals(req.user.userId);
  }

  @Post('records/:id/action')
  @Permissions(Permission.OA_APPROVE)
  @ApiOperation({
    summary: '处理审批（同意 / 驳回 / 转交）',
    description: '需 **`oa:approve`**。',
  })
  @ApiParam({ name: 'id', description: '审批记录 approval_records.id' })
  @ApiBody({ type: ApprovalActionDto })
  processApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalActionDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.processApproval(id, req.user.userId, dto);
  }

  @Get(':id')
  @Permissions(Permission.OA_MANAGE)
  @ApiOperation({
    summary: '审批流程详情',
    description: '需 **`oa:manage`**。',
  })
  @ApiParam({ name: 'id', description: 'approval_flows.id' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.findFlowById(id, req.user.enterpriseId);
  }

  @Patch(':id')
  @Permissions(Permission.OA_MANAGE)
  @ApiOperation({
    summary: '更新审批流程',
    description:
      '需 **`oa:manage`**。可改名称、步骤、启用状态；不支持修改 `type`（需新建流程）。',
  })
  @ApiParam({ name: 'id', description: 'approval_flows.id' })
  @ApiBody({ type: UpdateApprovalFlowDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApprovalFlowDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.updateFlow(id, req.user.enterpriseId, dto);
  }

  @Delete(':id')
  @Permissions(Permission.OA_MANAGE)
  @ApiOperation({
    summary: '删除审批流程',
    description:
      '需 **`oa:manage`**。若已有审批实例引用，请谨慎删除（外键约束可能报错）。',
  })
  @ApiParam({ name: 'id', description: 'approval_flows.id' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.deleteFlow(id, req.user.enterpriseId);
  }
}
