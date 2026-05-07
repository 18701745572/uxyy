import {
  Controller,
  Get,
  Query,
  Res,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExportService, type ExportFormat } from '../services/export.service';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../../modules/database/database.constants';
import type { AppDrizzleDb } from '../../modules/database/database.module';
import * as schema from '../../db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  @Get('customers')
  async exportCustomers(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const customers = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.enterpriseId, req.user.enterpriseId),
          eq(schema.customers.isDeleted, false),
        ),
      );

    const columns = [
      { key: 'name', header: '客户名称', width: 20 },
      { key: 'contactPerson', header: '联系人', width: 15 },
      { key: 'phone', header: '电话', width: 15 },
      { key: 'address', header: '地址', width: 30 },
      { key: 'type', header: '类型', width: 10 },
      { key: 'level', header: '等级', width: 10 },
      { key: 'industry', header: '行业', width: 15 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, customers, columns, '客户列表');

    const filename = `customers_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('products')
  async exportProducts(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const products = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.enterpriseId, req.user.enterpriseId));

    const columns = [
      { key: 'code', header: '商品编码', width: 15 },
      { key: 'name', header: '商品名称', width: 20 },
      { key: 'spec', header: '规格', width: 15 },
      { key: 'unit', header: '单位', width: 10 },
      { key: 'unitPrice', header: '单价', width: 12 },
      { key: 'costPrice', header: '成本价', width: 12 },
      { key: 'status', header: '状态', width: 10 },
    ];

    const result = this.exportService.export(format, products, columns, '商品列表');

    const filename = `products_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('sales-orders')
  async exportSalesOrders(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let conditions = eq(schema.salesOrders.enterpriseId, req.user.enterpriseId);

    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(schema.salesOrders.createdAt, new Date(startDate)),
        lte(schema.salesOrders.createdAt, new Date(endDate)),
      ) as any;
    }

    const orders = await this.db
      .select({
        order: schema.salesOrders,
        customerName: schema.customers.name,
      })
      .from(schema.salesOrders)
      .leftJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
      .where(conditions);

    const data = orders.map(({ order, customerName }) => ({
      ...order,
      customerName: customerName || '',
    }));

    const columns = [
      { key: 'orderNo', header: '订单编号', width: 20 },
      { key: 'customerName', header: '客户名称', width: 20 },
      { key: 'totalAmount', header: '订单金额', width: 12 },
      { key: 'discountAmount', header: '折扣金额', width: 12 },
      { key: 'payableAmount', header: '应付金额', width: 12 },
      { key: 'status', header: '状态', width: 10 },
      { key: 'deliveryType', header: '配送方式', width: 10 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, data, columns, '销售订单');

    const filename = `sales_orders_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('invoices')
  async exportInvoices(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let conditions = eq(schema.invoices.enterpriseId, req.user.enterpriseId);

    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(schema.invoices.createdAt, new Date(startDate)),
        lte(schema.invoices.createdAt, new Date(endDate)),
      ) as any;
    }

    const invoices = await this.db.select().from(schema.invoices).where(conditions);

    const columns = [
      { key: 'invoiceNo', header: '发票号码', width: 20 },
      { key: 'invoiceCode', header: '发票代码', width: 20 },
      { key: 'type', header: '发票类型', width: 15 },
      { key: 'amount', header: '金额', width: 12 },
      { key: 'taxRate', header: '税率', width: 10 },
      { key: 'taxAmount', header: '税额', width: 12 },
      { key: 'totalAmount', header: '价税合计', width: 12 },
      { key: 'buyerName', header: '购方名称', width: 20 },
      { key: 'sellerName', header: '销方名称', width: 20 },
      { key: 'status', header: '状态', width: 10 },
      { key: 'createdAt', header: '录入时间', width: 20 },
    ];

    const result = this.exportService.export(format, invoices, columns, '发票列表');

    const filename = `invoices_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }
}
