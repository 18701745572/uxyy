import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'AI 模块占位（无需鉴权）' })
  ping() {
    return { ok: true, module: 'ai' };
  }

  @ApiBearerAuth()
  @Get('queue/stats')
  @ApiOperation({ summary: 'BullMQ 队列计数（占位，供异步任务演进）' })
  queueStats() {
    return this.ai.getQueueStats();
  }
}
