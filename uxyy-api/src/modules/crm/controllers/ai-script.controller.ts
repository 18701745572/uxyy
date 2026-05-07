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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  @Get('generate/:customerId')
  generateScript(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('scene') scene: string,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiScriptService.generateScript(customerId, scene, req.user.enterpriseId);
  }

  /**
   * 根据客户状态智能推荐话术
   */
  @Get('recommend/:customerId')
  recommendScript(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.aiScriptService.recommendScriptByCustomerStatus(customerId, req.user.enterpriseId);
  }

  /**
   * 获取话术模板库
   */
  @Get('templates')
  getScriptTemplates(@Query('category') category?: string) {
    return this.aiScriptService.getScriptTemplates(category);
  }
}
