import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PurchaseSuggestionService } from '../services/purchase-suggestion.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('inventory/purchase-suggestions')
@UseGuards(JwtAuthGuard)
export class PurchaseSuggestionController {
  constructor(
    private readonly purchaseSuggestionService: PurchaseSuggestionService,
  ) {}

  /**
   * 获取智能采购建议
   */
  @Get()
  getSuggestions(@Req() req: Request & { user: UserContext }) {
    return this.purchaseSuggestionService.generateSuggestions(
      req.user.enterpriseId,
    );
  }

  /**
   * 获取库存预警
   */
  @Get('stock-alerts')
  getStockAlerts(@Req() req: Request & { user: UserContext }) {
    return this.purchaseSuggestionService.getStockAlerts(req.user.enterpriseId);
  }

  /**
   * 生成采购订单建议
   */
  @Get('order-suggestion')
  getPurchaseOrderSuggestion(
    @Req() req: Request & { user: UserContext },
    @Query('supplierId', new ParseIntPipe({ optional: true }))
    supplierId?: number,
  ) {
    return this.purchaseSuggestionService.generatePurchaseOrderSuggestion(
      req.user.enterpriseId,
      supplierId,
    );
  }
}
