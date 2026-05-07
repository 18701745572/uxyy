import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BarcodeService } from '../services/barcode.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('inventory/barcode')
@UseGuards(JwtAuthGuard)
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeService) {}

  /**
   * 通用扫码识别
   */
  @Get('scan')
  scan(
    @Query('code') code: string,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.barcodeService.scan(code, req.user.enterpriseId);
  }

  /**
   * 扫码入库
   */
  @Post('inbound')
  scanInbound(
    @Req() req: Request & { user: UserContext },
    @Body('barcode') barcode: string,
    @Body('quantity') quantity: string,
    @Body('batchNo') batchNo?: string,
    @Body('expiryDate') expiryDate?: Date,
    @Body('productionDate') productionDate?: Date,
  ) {
    return this.barcodeService.scanInbound(
      barcode,
      req.user.enterpriseId,
      quantity,
      req.user.userId,
      { batchNo, expiryDate, productionDate },
    );
  }

  /**
   * 扫码出库
   */
  @Post('outbound')
  scanOutbound(
    @Req() req: Request & { user: UserContext },
    @Body('barcode') barcode: string,
    @Body('quantity') quantity: string,
  ) {
    return this.barcodeService.scanOutbound(
      barcode,
      req.user.enterpriseId,
      quantity,
      req.user.userId,
    );
  }

  /**
   * 扫码盘点
   */
  @Post('stocktaking')
  scanStocktaking(
    @Req() req: Request & { user: UserContext },
    @Body('barcode') barcode: string,
    @Body('actualQty') actualQty: string,
  ) {
    return this.barcodeService.scanStocktaking(
      barcode,
      req.user.enterpriseId,
      actualQty,
    );
  }
}
