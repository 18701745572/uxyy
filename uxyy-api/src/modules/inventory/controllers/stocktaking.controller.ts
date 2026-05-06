import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Express } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StocktakingService } from '../services/stocktaking.service';
import {
  CreateStocktakingDto,
  StocktakingListQueryDto,
  UpdateStocktakingItemDto,
} from '../dto/stocktaking.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

function userIdFromRequest(req: Express.Request): number {
  const u = req.user;
  if (!u || typeof u !== 'object') return 1;
  return (u as { userId?: number }).userId ?? 1;
}

@ApiTags('库存盘点')
@Controller('inventory/stocktaking')
export class StocktakingController {
  constructor(private readonly service: StocktakingService) {}

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: '盘点单列表' })
  async list(@Req() req: Express.Request, @Query() q: StocktakingListQueryDto) {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: q.page,
      pageSize: q.pageSize,
      status: q.status,
    });
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: '盘点单详情' })
  async detail(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '创建盘点单（草稿）' })
  async create(
    @Req() req: Express.Request,
    @Body() body: CreateStocktakingDto,
  ) {
    return this.service.create(
      enterpriseIdFromRequest(req),
      body,
      userIdFromRequest(req),
    );
  }

  @ApiBearerAuth()
  @Patch(':orderId/items/:itemId')
  @ApiOperation({ summary: '更新盘点明细（实盘数量）' })
  async updateItem(
    @Req() req: Express.Request,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: UpdateStocktakingItemDto,
  ) {
    return this.service.updateItem(
      orderId,
      itemId,
      enterpriseIdFromRequest(req),
      body,
    );
  }

  @ApiBearerAuth()
  @Put(':id/confirm')
  @ApiOperation({ summary: '确认盘点（差异自动调库）' })
  async confirm(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.confirm(
      id,
      enterpriseIdFromRequest(req),
      userIdFromRequest(req),
    );
  }

  @ApiBearerAuth()
  @Post(':id/cancel')
  @ApiOperation({ summary: '作废盘点单（仅草稿）' })
  async cancel(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancel(id, enterpriseIdFromRequest(req));
  }
}
