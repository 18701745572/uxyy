import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { requireJwtUserId } from '../../../common/utils/jwt-request-context';
import { PurchaseOrdersService } from '../services/purchase-orders.service';
import {
  ApprovePurchaseOrderDto,
  CreatePurchaseOrderDto,
  InboundDto,
  PurchaseOrderListResponseDto,
  PurchaseOrderQueryDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from '../dto/purchase-order.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('inventory')
@Controller('inventory/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get()
  @ApiOperation({ summary: '采购订单分页列表' })
  async list(
    @Req() req: Express.Request,
    @Query() query: PurchaseOrderQueryDto,
  ): Promise<PurchaseOrderListResponseDto> {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      supplierId: query.supplierId,
    });
  }

  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: '创建采购订单（草稿）' })
  async create(
    @Req() req: Express.Request,
    @Body() body: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.create(
      enterpriseIdFromRequest(req),
      body,
      requireJwtUserId(req),
    );
  }

  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: '删除草稿采购单' })
  async remove(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: '采购订单详情（含明细）' })
  async get(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: '更新草稿采购单' })
  async patch(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.update(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Post(':id/submit')
  @ApiOperation({ summary: '提交采购单（draft → pending）' })
  async submit(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.submit(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Put(':id/approve')
  @ApiOperation({ summary: '审批采购单（pending → approved/cancelled）' })
  async approve(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApprovePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.approve(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Put(':id/inbound')
  @ApiOperation({ summary: '入库（增加库存，支持部分入库）' })
  async inbound(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: InboundDto,
  ) {
    return this.service.inbound(
      id,
      enterpriseIdFromRequest(req),
      body,
      requireJwtUserId(req),
    );
  }

  @ApiBearerAuth()
  @Post(':id/cancel')
  @ApiOperation({ summary: '取消采购单' })
  async cancel(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.cancel(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('import')
  @ApiOperation({
    summary: 'Excel/CSV 导入采购订单（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async import(
    @Req() req: Express.Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.service.importFromSpreadsheet(
      enterpriseIdFromRequest(req),
      file.buffer,
      mode,
      requireJwtUserId(req),
    );
  }
}
