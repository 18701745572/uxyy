import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApprovalFlowService } from '../services/approval-flow.service';
import {
  CreateApprovalFlowDto,
  UpdateApprovalFlowDto,
  ApprovalActionDto,
} from '../dtos/approval-flow.dto';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('oa/approval-flows')
@UseGuards(JwtAuthGuard)
export class ApprovalFlowController {
  constructor(private readonly service: ApprovalFlowService) {}

  @Post()
  create(@Body() dto: CreateApprovalFlowDto, @Req() req: Request & { user: UserContext }) {
    return this.service.createFlow(req.user.enterpriseId, dto);
  }

  @Get()
  findAll(@Req() req: Request & { user: UserContext }) {
    return this.service.findAllFlows(req.user.enterpriseId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.findFlowById(id, req.user.enterpriseId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateApprovalFlowDto,
    @Req() req: Request & { user: UserContext }
  ) {
    return this.service.updateFlow(id, req.user.enterpriseId, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request & { user: UserContext }) {
    return this.service.deleteFlow(id, req.user.enterpriseId);
  }

  // 获取待审批列表
  @Get('pending/list')
  getPendingApprovals(@Req() req: Request & { user: UserContext }) {
    return this.service.getPendingApprovals(req.user.role || '', req.user.enterpriseId);
  }

  // 获取我的审批记录
  @Get('my/records')
  getMyApprovals(@Req() req: Request & { user: UserContext }) {
    return this.service.getMyApprovals(req.user.userId);
  }

  // 处理审批
  @Post('records/:id/action')
  processApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApprovalActionDto,
    @Req() req: Request & { user: UserContext }
  ) {
    return this.service.processApproval(id, req.user.userId, dto);
  }
}
