import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { TaxReportService } from '../services/tax-report.service';
import { ExportService } from '../../../common/services/export.service';

@ApiTags('税务申报')
@ApiBearerAuth()
@Controller('finance/tax-report')
export class TaxReportController {
  constructor(
    private readonly taxReportService: TaxReportService,
    private readonly exportService: ExportService,
  ) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取税务申报汇总' })
  @ApiQuery({ name: 'period', description: '税款所属期，格式：YYYY-MM', example: '2026-05' })
  async getTaxReportSummary(@Request() req: any, @Query('period') period: string) {
    const enterpriseId = req.user.enterpriseId;
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.taxReportService.generateTaxReport(enterpriseId, period);
  }

  @Get('vat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取增值税申报数据' })
  @ApiQuery({ name: 'period', description: '税款所属期，格式：YYYY-MM', example: '2026-05' })
  async getVATReport(@Request() req: any, @Query('period') period: string) {
    const enterpriseId = req.user.enterpriseId;
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.taxReportService.generateVATReport(enterpriseId, period);
  }

  @Get('income-tax')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取企业所得税申报数据' })
  @ApiQuery({ name: 'period', description: '税款所属期，格式：YYYY-MM', example: '2026-05' })
  async getIncomeTaxReport(@Request() req: any, @Query('period') period: string) {
    const enterpriseId = req.user.enterpriseId;
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    return this.taxReportService.generateIncomeTaxReport(enterpriseId, period);
  }

  @Get('guides')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取税务申报操作指南' })
  async getTaxFilingGuides(@Request() req: any) {
    const enterpriseId = req.user.enterpriseId;
    return this.taxReportService.generateTaxFilingGuide(enterpriseId);
  }

  @Get('export/excel')
  @ApiOperation({ summary: '导出税务申报Excel' })
  @ApiQuery({ name: 'period', description: '税款所属期，格式：YYYY-MM', required: false })
  @ApiQuery({ name: 'taxType', description: '税种类型（可选）', required: false })
  async exportTaxReportExcel(
    @Request() req: any,
    @Query('period') period: string,
    @Query('taxType') taxType: string | undefined,
    @Res() res: Response,
  ) {
    const enterpriseId = req.user.enterpriseId;
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const result = await this.taxReportService.exportTaxReportExcel(
      enterpriseId,
      period,
      taxType,
    );
    const columns = [
      { key: '税种', header: '税种', width: 20 },
      { key: '税种代码', header: '税种代码', width: 12 },
      { key: '税款所属期', header: '税款所属期', width: 14 },
      { key: '金额', header: '金额', width: 16 },
      { key: '生成时间', header: '生成时间', width: 24 },
    ];
    const buf = this.exportService.exportToExcel(
      result.data as Record<string, unknown>[],
      columns,
      '税务申报',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.send(buf);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: '导出税务申报PDF（含操作指南）' })
  @ApiQuery({ name: 'period', description: '税款所属期，格式：YYYY-MM', required: false })
  async exportTaxReportPdf(
    @Request() req: any,
    @Query('period') period: string,
    @Res() res: Response,
  ) {
    const enterpriseId = req.user.enterpriseId;
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const result = await this.taxReportService.exportTaxReportPdf(enterpriseId, period);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"`,
    );
    res.send(result.htmlContent);
  }

  @Get('periods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取可申报的税款所属期列表' })
  async getAvailablePeriods(@Request() req: any) {
    const now = new Date();
    const periods: string[] = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      periods.push(`${year}-${month}`);
    }

    return {
      periods,
      current: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      quarterly: this.getQuarterlyPeriods(now),
    };
  }

  private getQuarterlyPeriods(now: Date): string[] {
    const periods: string[] = [];
    for (let i = 0; i < 4; i++) {
      const quarterStart = new Date(now.getFullYear(), i * 3, 1);
      const year = quarterStart.getFullYear();
      const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
      periods.push(`${year}Q${quarter}`);
    }
    return periods;
  }
}