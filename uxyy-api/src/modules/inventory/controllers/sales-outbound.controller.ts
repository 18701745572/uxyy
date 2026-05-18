import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import {
  SalesOutboundService,
  type CreateOutboundDto,
} from '../services/sales-outbound.service';

@Controller('inventory/sales-outbound')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SalesOutboundController {
  constructor(private readonly service: SalesOutboundService) {}

  @Get()
  @Permissions('inventory:sales_order')
  findPage(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('status') status?: string,
    @Query('orderId') orderId?: number,
  ) {
    const enterpriseId = Number((req as any).user?.enterpriseId);
    return this.service.findPage({
      enterpriseId,
      page,
      pageSize,
      status,
      orderId,
    });
  }

  @Get(':id')
  @Permissions('inventory:sales_order')
  findById(@Req() req: Request, @Param('id') id: number) {
    const enterpriseId = Number((req as any).user?.enterpriseId);
    return this.service.findById(enterpriseId, id);
  }

  @Post()
  @Permissions('inventory:sales_order')
  create(@Req() req: Request, @Body() dto: CreateOutboundDto) {
    const enterpriseId = Number((req as any).user?.enterpriseId);
    const userId = Number((req as any).user?.userId);
    return this.service.create(enterpriseId, userId, dto);
  }

  @Put(':id/confirm')
  @Permissions('inventory:sales_order')
  confirm(@Req() req: Request, @Param('id') id: number) {
    const enterpriseId = Number((req as any).user?.enterpriseId);
    const userId = Number((req as any).user?.userId);
    return this.service.confirm(enterpriseId, id, userId);
  }

  @Delete(':id')
  @Permissions('inventory:sales_order')
  delete(@Req() req: Request, @Param('id') id: number) {
    const enterpriseId = Number((req as any).user?.enterpriseId);
    return this.service.delete(enterpriseId, id);
  }
}
