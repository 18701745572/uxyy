import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import { AiFollowUpService } from '../services/ai-followup.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('crm/ai-followup')
@UseGuards(JwtAuthGuard)
export class AiFollowUpController {
  constructor(private readonly aiFollowUpService: AiFollowUpService) {}

  /**
   * 获取客户跟进建议
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('suggestions/:customerId')
  getFollowUpSuggestions(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiFollowUpService.generateFollowUpSuggestions(
      customerId,
      req.user.enterpriseId,
    );
  }

  /**
   * 获取客户洞察报告
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('insight/:customerId')
  getCustomerInsight(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiFollowUpService.getCustomerInsight(
      customerId,
      req.user.enterpriseId,
    );
  }

  /**
   * 获取需要跟进的客户列表
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('need-followup')
  getCustomersNeedFollowUp(
    @Req() req: Request & { user: UserContext },
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.aiFollowUpService.getCustomersNeedFollowUp(
      req.user.enterpriseId,
      { days, limit },
    );
  }

  /**
   * 生成跟进话术（与 AI 话术生成一致，要求 crm:write）
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Get('script/:customerId')
  generateFollowUpScript(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
    @Query('context') context?: string,
  ) {
    return this.aiFollowUpService.generateFollowUpScript(
      customerId,
      req.user.enterpriseId,
      context,
    );
  }
}
