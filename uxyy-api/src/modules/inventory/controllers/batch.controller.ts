import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BatchService, type CreateBatchDto } from '../services/batch.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('inventory/batches')
@UseGuards(JwtAuthGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Get()
  findAll(
    @Req() req: Request & { user: UserContext },
    @Query('productId', new ParseIntPipe({ optional: true }))
    productId?: number,
    @Query('status') status?: string,
    @Query('expiryWarning') expiryWarning?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.batchService.findAll(req.user.enterpriseId, {
      productId,
      status,
      expiryWarning: expiryWarning === 'true',
      page,
      pageSize,
    });
  }

  @Get(':id')
  findById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.batchService.findById(id, req.user.enterpriseId);
  }

  @Post()
  create(
    @Req() req: Request & { user: UserContext },
    @Body() dto: CreateBatchDto,
  ) {
    return this.batchService.createBatch(
      req.user.enterpriseId,
      req.user.userId,
      dto,
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() dto: Partial<CreateBatchDto>,
  ) {
    return this.batchService.update(id, req.user.enterpriseId, dto);
  }

  @Post(':id/outbound')
  outbound(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('quantity') quantity: string,
    @Body('sourceType') sourceType?: string,
    @Body('sourceId') sourceId?: number,
  ) {
    return this.batchService.outbound(
      id,
      req.user.enterpriseId,
      quantity,
      req.user.userId,
      sourceType,
      sourceId,
    );
  }

  @Get('expiring/list')
  getExpiringBatches(
    @Req() req: Request & { user: UserContext },
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.batchService.getExpiringBatches(req.user.enterpriseId, days);
  }

  @Get('product/:productId/stock')
  getProductBatchStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.batchService.getProductBatchStock(
      productId,
      req.user.enterpriseId,
    );
  }

  @Post('allocate-outbound')
  allocateBatches(
    @Req() req: Request & { user: UserContext },
    @Body('productId') productId: number,
    @Body('quantity') quantity: string,
  ) {
    return this.batchService.allocateBatchesForOutbound(
      productId,
      req.user.enterpriseId,
      quantity,
    );
  }
}
