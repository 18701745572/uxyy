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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InventoryService } from './inventory.service';
import type { CreateProductDto, UpdateProductDto, CreatePurchaseOrderDto, CreateSalesOrderDto } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ========== 商品管理 ==========
  @Get('products')
  @ApiOperation({ summary: '获取商品列表' })
  async getProducts(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('category') category?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.findProductsPage({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      category,
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: '获取商品详情' })
  async getProductById(@Req() req: Request, @Param('id') id: string) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.getProductById(enterpriseId, parseInt(id, 10));
  }

  @Post('products')
  @ApiOperation({ summary: '创建商品' })
  async createProduct(@Req() req: Request, @Body() dto: CreateProductDto) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.createProduct(enterpriseId, dto);
  }

  @Put('products/:id')
  @ApiOperation({ summary: '更新商品' })
  async updateProduct(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.updateProduct(enterpriseId, parseInt(id, 10), dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: '删除商品' })
  async deleteProduct(@Req() req: Request, @Param('id') id: string) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.deleteProduct(enterpriseId, parseInt(id, 10));
  }

  @Get('alerts')
  @ApiOperation({ summary: '获取库存预警列表' })
  async getStockAlerts(@Req() req: Request) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.getStockAlerts(enterpriseId);
  }

  // ========== 采购订单 ==========
  @Get('purchase-orders')
  @ApiOperation({ summary: '获取采购订单列表' })
  async getPurchaseOrders(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.findPurchaseOrdersPage({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      status,
    });
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: '创建采购订单' })
  async createPurchaseOrder(@Req() req: Request, @Body() dto: CreatePurchaseOrderDto) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.createPurchaseOrder(enterpriseId, dto);
  }

  @Post('purchase-orders/:id/confirm')
  @ApiOperation({ summary: '确认采购入库' })
  async confirmPurchaseOrder(@Req() req: Request, @Param('id') id: string) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.confirmPurchaseOrder(enterpriseId, parseInt(id, 10));
  }

  // ========== 销售订单 ==========
  @Get('sales-orders')
  @ApiOperation({ summary: '获取销售订单列表' })
  async getSalesOrders(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.findSalesOrdersPage({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      status,
    });
  }

  @Post('sales-orders')
  @ApiOperation({ summary: '创建销售订单' })
  async createSalesOrder(@Req() req: Request, @Body() dto: CreateSalesOrderDto) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.createSalesOrder(enterpriseId, dto);
  }

  @Post('sales-orders/:id/confirm')
  @ApiOperation({ summary: '确认销售出库' })
  async confirmSalesOrder(@Req() req: Request, @Param('id') id: string) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.confirmSalesOrder(enterpriseId, parseInt(id, 10));
  }

  // ========== 库存流水 ==========
  @Get('logs')
  @ApiOperation({ summary: '获取库存流水' })
  async getInventoryLogs(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('productId') productId?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.inventoryService.findInventoryLogs({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      productId: productId ? parseInt(productId, 10) : undefined,
    });
  }

  @Get('ping')
  @ApiOperation({ summary: '库存模块健康检查' })
  ping() {
    return { ok: true, module: 'inventory' };
  }
}
