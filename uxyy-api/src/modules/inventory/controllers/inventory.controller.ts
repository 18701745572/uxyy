import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Express } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { InventoryService } from '../services/inventory.service';
import {
  AdjustInventoryDto,
  InventoryListQueryDto,
  InventoryListResponseDto,
  InventoryLogListResponseDto,
  InventoryLogQueryDto,
  StockAlertResponseDto,
} from '../dto/inventory.dto';
import {
  CreateStockAlertDto,
  StockAlertListQueryDto,
  UpdateStockAlertDto,
} from '../dto/stock-alert.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

function userIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (u && typeof u === 'object') {
    const raw = (u as { id?: unknown }).id;
    if (typeof raw === 'number') return raw;
  }
  return undefined;
}

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Public()
  @Get('ping')
  @ApiOperation({ summary: '进销存模块存活探针（无需鉴权）' })
  ping() {
    return { ok: true, module: 'inventory' };
  }

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get()
  @ApiOperation({ summary: '库存看板（分页，支持分类/低库存筛选）' })
  async list(
    @Req() req: Express.Request,
    @Query() query: InventoryListQueryDto,
  ): Promise<InventoryListResponseDto> {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      categoryId: query.categoryId,
      keyword: query.keyword,
      lowStock: query.lowStock,
    });
  }

  @ApiBearerAuth()
  @Put('adjust')
  @ApiOperation({ summary: '手动库存调整（盘点增减）' })
  async adjust(@Req() req: Express.Request, @Body() body: AdjustInventoryDto) {
    return this.service.adjust(
      enterpriseIdFromRequest(req),
      body,
      userIdFromRequest(req),
    );
  }

  @ApiBearerAuth()
  @Get('logs')
  @ApiOperation({ summary: '库存流水查询（分页，支持商品/类型/日期筛选）' })
  async logs(
    @Req() req: Express.Request,
    @Query() query: InventoryLogQueryDto,
  ): Promise<InventoryLogListResponseDto> {
    return this.service.findLogs({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      productId: query.productId,
      type: query.type,
      startDate: query.startDate,
      endDate: query.endDate,
      sourceType: query.sourceType,
    });
  }

  @ApiBearerAuth()
  @Get('alerts')
  @ApiOperation({ summary: '库存预警列表（低于下限的商品）' })
  async alerts(@Req() req: Express.Request): Promise<StockAlertResponseDto> {
    return this.service.getAlerts(enterpriseIdFromRequest(req));
  }

  // ==================== 库存预警管理 ====================

  @ApiBearerAuth()
  @Get('stock-alerts')
  @ApiOperation({ summary: '库存预警记录列表（分页，支持类型/状态筛选）' })
  async listStockAlerts(
    @Req() req: Express.Request,
    @Query() query: StockAlertListQueryDto,
  ) {
    return this.service.findStockAlerts({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      type: query.type,
      status: query.status,
      productId: query.productId,
    });
  }

  @ApiBearerAuth()
  @Get('stock-alerts/stats')
  @ApiOperation({ summary: '库存预警统计' })
  async getStockAlertStats(@Req() req: Express.Request) {
    return this.service.getStockAlertStats(enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('stock-alerts/check')
  @ApiOperation({ summary: '手动触发库存检查并创建预警' })
  async checkAndCreateAlerts(@Req() req: Express.Request) {
    return this.service.checkAndCreateAlerts(enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('stock-alerts')
  @ApiOperation({ summary: '手动创建库存预警' })
  async createStockAlert(
    @Req() req: Express.Request,
    @Body() body: CreateStockAlertDto,
  ) {
    return this.service.createStockAlert(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Put('stock-alerts/:id')
  @ApiOperation({ summary: '更新库存预警状态' })
  async updateStockAlert(
    @Req() req: Express.Request,
    @Param('id') id: string,
    @Body() body: UpdateStockAlertDto,
  ) {
    return this.service.updateStockAlert(
      enterpriseIdFromRequest(req),
      Number(id),
      body,
    );
  }
}
