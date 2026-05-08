import {
  Body,
  Controller,
  Delete,
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
import { MemberPriceService, type SetMemberPriceDto } from '../services/member-price.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('inventory/member-prices')
@UseGuards(JwtAuthGuard)
export class MemberPriceController {
  constructor(private readonly memberPriceService: MemberPriceService) {}

  @Post()
  setMemberPrice(
    @Req() req: Request & { user: UserContext },
    @Body() dto: SetMemberPriceDto,
  ) {
    return this.memberPriceService.setMemberPrice(req.user.enterpriseId, dto);
  }

  @Get('product/:productId')
  getProductMemberPrices(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberPriceService.getProductMemberPrices(productId, req.user.enterpriseId);
  }

  @Get('level/:levelId')
  getLevelProductPrices(
    @Param('levelId', ParseIntPipe) levelId: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberPriceService.getLevelProductPrices(levelId, req.user.enterpriseId);
  }

  @Get('customer-price')
  getCustomerPrice(
    @Req() req: Request & { user: UserContext },
    @Query('customerId', new ParseIntPipe()) customerId: number,
    @Query('productId', new ParseIntPipe()) productId: number,
  ) {
    return this.memberPriceService.getCustomerPrice(
      customerId,
      productId,
      req.user.enterpriseId,
    );
  }

  @Post('product/:productId/batch')
  batchSetMemberPrices(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: Request & { user: UserContext },
    @Body() prices: Array<{ levelId: number; price: string; discountRate?: string }>,
  ) {
    return this.memberPriceService.batchSetMemberPrices(
      req.user.enterpriseId,
      productId,
      prices,
    );
  }

  @Delete(':id')
  deleteMemberPrice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.memberPriceService.deleteMemberPrice(id, req.user.enterpriseId);
  }
}
