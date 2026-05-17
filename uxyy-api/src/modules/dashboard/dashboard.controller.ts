import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { DashboardService } from './dashboard.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@ApiTags('工作台')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: '获取经营概览数据' })
  async getOverview(@Req() req: Request & { user: UserContext }) {
    return this.dashboardService.getOverview(req.user.enterpriseId);
  }

  @Get('todos')
  @ApiOperation({ summary: '获取待办事项' })
  async getTodos(@Req() req: Request & { user: UserContext }) {
    return this.dashboardService.getTodos(
      req.user.enterpriseId,
      req.user.userId,
    );
  }
}
