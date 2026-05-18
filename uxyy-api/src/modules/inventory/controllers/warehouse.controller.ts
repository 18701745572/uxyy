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
import {
  WarehouseService,
  type CreateWarehouseDto,
  type UpdateWarehouseDto,
} from '../services/warehouse.service';

interface UserContext {
  userId: number;
  enterpriseId?: number;
  role?: string;
}

@Controller('inventory/warehouses')
@UseGuards(JwtAuthGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  create(
    @Req() req: Request & { user: UserContext },
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehouseService.create(
      req.user.enterpriseId,
      dto,
      req.user.userId,
    );
  }

  @Get()
  findAll(
    @Req() req: Request & { user: UserContext },
    @Query('status') status?: string,
  ) {
    return this.warehouseService.findAll(req.user.enterpriseId, status);
  }

  @Get('default')
  getDefaultWarehouse(@Req() req: Request & { user: UserContext }) {
    return this.warehouseService.getDefaultWarehouse(req.user.enterpriseId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.warehouseService.findOne(id, req.user.enterpriseId);
  }

  @Get(':id/inventory')
  getWarehouseInventory(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.warehouseService.getWarehouseInventorySummary(
      req.user.enterpriseId,
      id,
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehouseService.update(id, req.user.enterpriseId, dto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.warehouseService.remove(id, req.user.enterpriseId);
  }
}
