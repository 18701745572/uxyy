import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AiService } from './ai.service';
import type { OcrInvoiceDto, SmartSuggestionDto } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ========== OCR 发票识别 ==========
  @Post('ocr/invoice')
  @ApiOperation({ summary: '提交发票 OCR 识别任务' })
  async submitOcrTask(@Req() req: Request, @Body() dto: { imageUrl: string }) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.aiService.submitOcrTask({
      imageUrl: dto.imageUrl,
      enterpriseId,
    });
  }

  @Get('ocr/result/:jobId')
  @ApiOperation({ summary: '获取 OCR 识别结果' })
  async getOcrResult(@Param('jobId') jobId: string) {
    return this.aiService.getOcrResult(jobId);
  }

  // ========== 智能建议 ==========
  @Get('suggestions')
  @ApiOperation({ summary: '获取智能建议' })
  async getSmartSuggestions(
    @Req() req: Request,
    @Query('type') type: 'inventory' | 'finance' | 'customer',
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.aiService.getSmartSuggestions({ type, enterpriseId });
  }

  // ========== 智能记账 ==========
  @Post('auto-bookkeeping')
  @ApiOperation({ summary: '智能记账 - 根据 OCR 结果自动生成凭证' })
  async autoBookkeeping(@Body() dto: { ocrResult: any }) {
    return this.aiService.autoBookkeeping(dto.ocrResult);
  }

  @Get('ping')
  @ApiOperation({ summary: 'AI 模块健康检查' })
  ping() {
    return { ok: true, module: 'ai' };
  }
}
