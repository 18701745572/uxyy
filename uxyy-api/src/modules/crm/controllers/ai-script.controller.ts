import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import { AiScriptService } from '../services/ai-script.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('crm/ai-scripts')
@UseGuards(JwtAuthGuard)
export class AiScriptController {
  constructor(private readonly aiScriptService: AiScriptService) {}

  /**
   * 根据场景生成话术
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Get('generate/:customerId')
  generateScript(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('scene') scene: string,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiScriptService.generateScript(
      customerId,
      scene,
      req.user.enterpriseId,
    );
  }

  /**
   * 根据客户状态智能推荐话术
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_WRITE)
  @Get('recommend/:customerId')
  recommendScript(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiScriptService.recommendScriptByCustomerStatus(
      customerId,
      req.user.enterpriseId,
    );
  }

  /**
   * 获取话术模板库
   */
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CRM_READ)
  @Get('templates')
  getScriptTemplates(@Query('category') category?: string) {
    return this.aiScriptService.getScriptTemplates(category);
  }
}
