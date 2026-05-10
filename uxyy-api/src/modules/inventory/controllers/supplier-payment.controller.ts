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
} from '@nestjs/common';
import type { Express } from 'express';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { requireJwtUserId } from '../../../common/utils/jwt-request-context';
import { SupplierPaymentService } from '../services/supplier-payment.service';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('inventory')
@Controller('inventory/supplier-payments')
export class SupplierPaymentController {
  constructor(private readonly service: SupplierPaymentService) {}

  @ApiBearerAuth()
  @Get()
  list(
    @Req() req: Express.Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('supplierId') supplierId?: string,
    @Query('orderId') orderId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 20,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
      orderId: orderId ? parseInt(orderId) : undefined,
      startDate,
      endDate,
    });
  }

  @ApiBearerAuth()
  @Get(':id')
  get(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.findOne(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post()
  create(
    @Req() req: Express.Request,
    @Body() body: {
      supplierId: number;
      orderId?: number;
      amount: string | number;
      paymentMethod: 'cash' | 'bank' | 'alipay' | 'wechat';
      paymentDate?: string;
      referenceNo?: string;
      remark?: string;
    },
  ) {
    return this.service.create(
      enterpriseIdFromRequest(req),
      body,
      requireJwtUserId(req),
    );
  }

  @ApiBearerAuth()
  @Patch(':id')
  update(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      amount?: string | number;
      paymentMethod?: 'cash' | 'bank' | 'alipay' | 'wechat';
      paymentDate?: string;
      referenceNo?: string;
      remark?: string;
    },
  ) {
    return this.service.update(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Delete(':id')
  delete(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.delete(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get('supplier/:supplierId/stats')
  getSupplierStats(
    @Req() req: Express.Request,
    @Param('supplierId', ParseIntPipe) supplierId: number,
  ) {
    return this.service.getSupplierPaymentStats(supplierId, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get('order/:orderId/stats')
  getOrderStats(
    @Req() req: Express.Request,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.service.getOrderPaymentStats(orderId, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get('payable/stats')
  getAccountsPayableStats(@Req() req: Express.Request) {
    return this.service.getAccountsPayableStats(enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Get('payable/aging')
  getAccountsPayableAging(@Req() req: Express.Request) {
    return this.service.getAccountsPayableAging(enterpriseIdFromRequest(req));
  }
}