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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SalesOrdersService } from '../services/sales-orders.service';
import {
  ApproveOrderDto,
  CreateSalesOrderDto,
  OutboundDto,
  SalesOrderListResponseDto,
  SalesOrderQueryDto,
  SalesOrderResponseDto,
  UpdateSalesOrderDto,
} from '../dto/sales-order.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

function userIdFromRequest(req: Express.Request): number {
  const u = req.user;
  if (u && typeof u === 'object') {
    const raw = (u as { id?: unknown }).id;
    if (typeof raw === 'number') return raw;
  }
  return 0;
}

@ApiTags('inventory')
@Controller('inventory/sales-orders')
export class SalesOrdersController {
  constructor(private readonly service: SalesOrdersService) {}

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get()
  @ApiOperation({ summary: '销售订单分页列表' })
  async list(
    @Req() req: Express.Request,
    @Query() query: SalesOrderQueryDto,
  ): Promise<SalesOrderListResponseDto> {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      customerId: query.customerId,
    });
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '创建销售订单（草稿）' })
  async create(
    @Req() req: Express.Request,
    @Body() body: CreateSalesOrderDto,
  ): Promise<SalesOrderResponseDto> {
    return this.service.create(
      enterpriseIdFromRequest(req),
      body,
      userIdFromRequest(req),
    );
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: '销售订单详情（含明细）' })
  async get(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SalesOrderResponseDto> {
    return this.service.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: '更新草稿订单' })
  async patch(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSalesOrderDto,
  ): Promise<SalesOrderResponseDto> {
    return this.service.update(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Post(':id/submit')
  @ApiOperation({ summary: '提交订单（draft → pending）' })
  async submit(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SalesOrderResponseDto> {
    return this.service.submit(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Put(':id/approve')
  @ApiOperation({ summary: '审批订单（pending → approved/cancelled）' })
  async approve(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApproveOrderDto,
  ): Promise<SalesOrderResponseDto> {
    return this.service.approve(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Put(':id/outbound')
  @ApiOperation({ summary: '出库（扣减库存，支持部分出库）' })
  async outbound(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OutboundDto,
  ) {
    return this.service.outbound(
      id,
      enterpriseIdFromRequest(req),
      body,
      userIdFromRequest(req),
    );
  }

  @ApiBearerAuth()
  @Post(':id/cancel')
  @ApiOperation({ summary: '取消订单（恢复已扣库存）' })
  async cancel(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancel(
      id,
      enterpriseIdFromRequest(req),
      userIdFromRequest(req),
    );
  }
}
