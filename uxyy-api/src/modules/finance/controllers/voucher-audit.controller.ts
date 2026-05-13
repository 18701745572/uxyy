import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../auth/role-permissions';
import { VoucherAuditService } from '../services/voucher-audit.service';
import { AccountMappingService } from '../services/account-mapping.service';
import { AutoAccountingV2Service } from '../services/auto-accounting-v2.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@ApiTags('凭证审核工作流')
@ApiBearerAuth()
@Controller('finance/voucher-audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VoucherAuditController {
  constructor(
    private readonly voucherAuditService: VoucherAuditService,
    private readonly accountMappingService: AccountMappingService,
    private readonly autoAccountingService: AutoAccountingV2Service,
  ) {}

  // ==================== 凭证详情 ====================

  @Get(':id')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取凭证详情' })
  async getVoucherDetail(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.voucherAuditService.getVoucherDetail(id, req.user.enterpriseId);
  }

  // ==================== 凭证列表 ====================

  @Get('list/pending')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取待审核凭证列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getPendingList(
    @Req() req: Request & { user: UserContext },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.voucherAuditService.getPendingVouchers(req.user.enterpriseId, {
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  @Get('list/all')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取凭证列表' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getVoucherList(
    @Req() req: Request & { user: UserContext },
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.voucherAuditService.getVoucherList(req.user.enterpriseId, {
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });
  }

  // ==================== 审核操作 ====================

  @Post(':id/submit')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '提交凭证审核' })
  async submitForAudit(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('comment') comment?: string,
  ) {
    return this.voucherAuditService.submitForAudit(
      id,
      req.user.enterpriseId,
      req.user.userId,
      comment,
    );
  }

  @Post(':id/approve')
  @Permissions(Permission.FIN_AUDIT)
  @ApiOperation({ summary: '审核通过' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('comment') comment?: string,
  ) {
    return this.voucherAuditService.approve(
      id,
      req.user.enterpriseId,
      req.user.userId,
      comment,
    );
  }

  @Post(':id/reject')
  @Permissions(Permission.FIN_AUDIT)
  @ApiOperation({ summary: '驳回凭证' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('reason') reason: string,
  ) {
    if (!reason) {
      throw new BadRequestException('请填写驳回原因');
    }
    return this.voucherAuditService.reject(
      id,
      req.user.enterpriseId,
      req.user.userId,
      reason,
    );
  }

  @Post(':id/post')
  @Permissions(Permission.FIN_POST)
  @ApiOperation({ summary: '凭证过账' })
  async post(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('comment') comment?: string,
  ) {
    return this.voucherAuditService.post(
      id,
      req.user.enterpriseId,
      req.user.userId,
      comment,
    );
  }

  @Post(':id/void')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '作废凭证' })
  async void(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('reason') reason: string,
  ) {
    if (!reason) {
      throw new BadRequestException('请填写作废原因');
    }
    return this.voucherAuditService.void(
      id,
      req.user.enterpriseId,
      req.user.userId,
      reason,
    );
  }

  // ==================== 批量操作 ====================

  @Post('batch/submit')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '批量提交审核' })
  async batchSubmit(
    @Req() req: Request & { user: UserContext },
    @Body('ids') ids: number[],
  ) {
    return this.voucherAuditService.batchSubmit(
      ids,
      req.user.enterpriseId,
      req.user.userId,
    );
  }

  @Post('batch/approve')
  @Permissions(Permission.FIN_AUDIT)
  @ApiOperation({ summary: '批量审核通过' })
  async batchApprove(
    @Req() req: Request & { user: UserContext },
    @Body('ids') ids: number[],
    @Body('comment') comment?: string,
  ) {
    return this.voucherAuditService.batchApprove(
      ids,
      req.user.enterpriseId,
      req.user.userId,
      comment,
    );
  }

  // ==================== 科目映射管理 ====================

  @Get('config/mapping-rules')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取科目映射规则' })
  async getMappingRules(
    @Req() req: Request & { user: UserContext },
    @Query('businessType') businessType?: string,
  ) {
    return this.accountMappingService.getMappingRules(
      req.user.enterpriseId,
      businessType,
    );
  }

  @Post('config/mapping-rules')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '创建/更新科目映射规则' })
  async saveMappingRule(
    @Req() req: Request & { user: UserContext },
    @Body() data: {
      id?: number;
      businessType: string;
      subType?: string;
      debitAccountId: number;
      creditAccountId: number;
      description?: string;
      priority?: number;
    },
  ) {
    return this.accountMappingService.saveMappingRule(
      req.user.enterpriseId,
      data,
      req.user.userId,
      data.id,
    );
  }

  @Post('config/initialize-defaults')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '初始化默认科目映射' })
  async initializeDefaults(
    @Req() req: Request & { user: UserContext },
  ) {
    await this.accountMappingService.initializeDefaultMappings(
      req.user.enterpriseId,
      req.user.userId,
    );
    return { success: true, message: '默认科目映射已初始化' };
  }

  // ==================== 自动记账 ====================

  @Post('auto-generate/sales-order')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '销售单自动记账' })
  async autoAccountSalesOrder(
    @Req() req: Request & { user: UserContext },
    @Body() order: any,
  ) {
    return this.autoAccountingService.autoAccountSalesOrder(
      order,
      req.user.enterpriseId,
      req.user.userId,
    );
  }

  @Post('auto-generate/purchase-order')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '采购单自动记账' })
  async autoAccountPurchaseOrder(
    @Req() req: Request & { user: UserContext },
    @Body() order: any,
  ) {
    return this.autoAccountingService.autoAccountPurchaseOrder(
      order,
      req.user.enterpriseId,
      req.user.userId,
    );
  }
}
