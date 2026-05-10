import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AiService } from './ai.service';
import {
  ApplyAiTaskVoucherResponse,
  ApplyVoucherFromAiTaskDto,
  AiTaskResponse,
  QueueStatsResponse,
  SubmitTaskDto,
} from './ai.dto';

function requireAiCtx(
  req: Request,
): Express.UserPayload & { enterpriseId: number } {
  const u = req.user as Express.UserPayload | undefined;
  if (!u) {
    throw new ForbiddenException('未登录');
  }
  const enterpriseId = u.enterpriseId;
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业');
  }
  return { ...u, enterpriseId: Number(enterpriseId) };
}

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'AI 模块健康检查（无需鉴权）' })
  ping() {
    return { ok: true, module: 'ai' };
  }

  @ApiBearerAuth()
  @Get('queue/stats')
  @ApiOperation({ summary: 'BullMQ 队列统计（含死信队列）' })
  async queueStats(): Promise<QueueStatsResponse> {
    return this.ai.getQueueStats();
  }

  // ── 异步任务 ──

  @ApiBearerAuth()
  @Post('tasks')
  @ApiOperation({
    summary: '提交 AI 异步任务（OCR/记账建议/分类），支持幂等 clientKey',
  })
  async submitTask(
    @Req() req: Request,
    @Body() dto: SubmitTaskDto,
  ): Promise<AiTaskResponse> {
    const { userId, enterpriseId } = requireAiCtx(req);
    return this.ai.submitTask(dto, enterpriseId, userId);
  }

  @ApiBearerAuth()
  @Get('tasks')
  @ApiOperation({ summary: '查询 AI 任务列表（分页，可按类型/状态过滤）' })
  @ApiQuery({ name: 'taskType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async listTasks(
    @Req() req: Request,
    @Query('taskType') taskType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const { enterpriseId } = requireAiCtx(req);
    return this.ai.listTasks(enterpriseId, {
      taskType,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @ApiBearerAuth()
  @Get('tasks/:id')
  @ApiOperation({ summary: '查询单个 AI 任务状态与结果' })
  async getTask(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AiTaskResponse> {
    const { enterpriseId } = requireAiCtx(req);
    const task = await this.ai.getTask(enterpriseId, id);
    if (!task) {
      throw new NotFoundException('任务不存在或无权查看');
    }
    return task;
  }

  @ApiBearerAuth()
  @Post('tasks/:id/voucher')
  @ApiOperation({
    summary:
      '将已完成任务的 AI 输出写入财务凭证（可覆盖科目/金额/摘要；同一任务重复调用幂等）',
  })
  @ApiBody({ type: ApplyVoucherFromAiTaskDto, required: false })
  async applyVoucherFromAiTask(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApplyVoucherFromAiTaskDto,
  ): Promise<ApplyAiTaskVoucherResponse> {
    const { userId, enterpriseId } = requireAiCtx(req);
    return this.ai.applyVoucherFromAiTask(enterpriseId, userId, id, dto);
  }

  // ── 智能建议（同步便捷接口） ──

  @ApiBearerAuth()
  @Get('suggestions')
  @ApiOperation({
    summary: '获取智能经营建议（inventory / finance / customer）',
  })
  @ApiQuery({ name: 'type', enum: ['inventory', 'finance', 'customer'] })
  async getSmartSuggestions(
    @Req() req: Request,
    @Query('type') type: 'inventory' | 'finance' | 'customer',
  ) {
    const { userId, enterpriseId } = requireAiCtx(req);
    return this.ai.getSmartSuggestions(type, enterpriseId, userId);
  }
}
