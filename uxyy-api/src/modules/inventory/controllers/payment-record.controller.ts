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
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  PaymentRecordService,
  type CreatePaymentRecordDto,
  type UpdatePaymentRecordDto,
} from '../services/payment-record.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('inventory/payment-records')
@UseGuards(JwtAuthGuard)
export class PaymentRecordController {
  constructor(private readonly service: PaymentRecordService) {}

  @Get()
  findPage(
    @Req() req: Request & { user: UserContext },
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('customerId', new ParseIntPipe({ optional: true })) customerId?: number,
    @Query('orderId', new ParseIntPipe({ optional: true })) orderId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findPage({
      enterpriseId: req.user.enterpriseId,
      page: page ?? 1,
      pageSize: pageSize ?? 10,
      customerId,
      orderId,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.findOne(id, req.user.enterpriseId);
  }

  @Post()
  create(
    @Body() dto: CreatePaymentRecordDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.create(req.user.enterpriseId, dto, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentRecordDto,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.update(id, req.user.enterpriseId, dto);
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.delete(id, req.user.enterpriseId);
  }

  @Get('stats/customer/:customerId')
  getCustomerStats(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.getCustomerPaymentStats(customerId, req.user.enterpriseId);
  }

  @Get('stats/order/:orderId')
  getOrderStats(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.service.getOrderPaymentStats(orderId, req.user.enterpriseId);
  }
}
