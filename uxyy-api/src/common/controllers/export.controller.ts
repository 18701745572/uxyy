import {
  Controller,
  Get,
  Inject,
  Query,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../../modules/auth/permissions.guard';
import { Permission } from '../../modules/auth/role-permissions';
import { ExportService, type ExportFormat } from '../services/export.service';
import { AuditLogService } from '../services/audit-log.service';
import { DRIZZLE_DB } from '../../modules/database/database.constants';
import type { AppDrizzleDb } from '../../modules/database/database.module';
import * as schema from '../../db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';
import { FinanceService } from '../../modules/finance/finance.service';
import {
  arApCsvColumns,
  arApCsvRows,
  arApExcelWorkbook,
  balanceSheetCsvColumns,
  balanceSheetCsvRows,
  balanceSheetExcelWorkbook,
  cashFlowExcelColumns,
  incomeStatementExcelColumns,
  incomeStatementExcelRows,
  cashFlowExcelRows,
} from '../utils/finance-report-export.mappers';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

function enterpriseIdFromRequest(
  req: Request & { user: UserContext },
): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = u.enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@Controller('export')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly auditLogService: AuditLogService,
    private readonly financeService: FinanceService,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  @Get('customers')
  @Permissions(Permission.CRM_READ)
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
  @Permissions(Permission.INV_READ)
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

  @Get('suppliers')
  @Permissions(Permission.INV_READ)
  async exportSuppliers(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const suppliers = await this.db
      .select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.enterpriseId, req.user.enterpriseId));

    const columns = [
      { key: 'name', header: '供应商名称', width: 25 },
      { key: 'contactName', header: '联系人', width: 15 },
      { key: 'phone', header: '联系电话', width: 15 },
      { key: 'address', header: '地址', width: 30 },
      { key: 'status', header: '状态', width: 10 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, suppliers, columns, '供应商列表');

    const filename = `suppliers_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('sales-orders')
  @Permissions(Permission.INV_SALES_ORDER)
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

  @Get('purchase-orders')
  @Permissions(Permission.INV_PURCHASE)
  async exportPurchaseOrders(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let conditions = eq(schema.purchaseOrders.enterpriseId, req.user.enterpriseId);

    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(schema.purchaseOrders.createdAt, new Date(startDate)),
        lte(schema.purchaseOrders.createdAt, new Date(endDate)),
      ) as any;
    }

    const orders = await this.db
      .select({
        order: schema.purchaseOrders,
        supplierName: schema.suppliers.name,
      })
      .from(schema.purchaseOrders)
      .leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplierId, schema.suppliers.id))
      .where(conditions);

    const data = orders.map(({ order, supplierName }) => ({
      ...order,
      supplierName: supplierName || '',
    }));

    const columns = [
      { key: 'orderNo', header: '订单编号', width: 20 },
      { key: 'supplierName', header: '供应商', width: 20 },
      { key: 'totalAmount', header: '订单金额', width: 12 },
      { key: 'discountAmount', header: '折扣金额', width: 12 },
      { key: 'payableAmount', header: '应付金额', width: 12 },
      { key: 'status', header: '状态', width: 10 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, data, columns, '采购订单');

    const filename = `purchase_orders_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('invoices')
  @Permissions(Permission.FIN_READ)
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

  @Get('stocktaking')
  @Permissions(Permission.INV_READ)
  async exportStocktaking(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let conditions = eq(schema.stocktakingOrders.enterpriseId, req.user.enterpriseId);

    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(schema.stocktakingOrders.createdAt, new Date(startDate)),
        lte(schema.stocktakingOrders.createdAt, new Date(endDate)),
      ) as any;
    }

    const orders = await this.db.select().from(schema.stocktakingOrders).where(conditions);

    const data = orders.map((order) => ({
      ...order,
      stocktakingNo: `ST${String(order.id).padStart(6, '0')}`,
    }));

    const columns = [
      { key: 'stocktakingNo', header: '盘点单号', width: 20 },
      { key: 'warehouseId', header: '仓库ID', width: 12 },
      { key: 'status', header: '状态', width: 10 },
      { key: 'remark', header: '备注', width: 30 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, data, columns, '库存盘点');

    const filename = `stocktaking_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('member_levels')
  @Permissions(Permission.CRM_READ)
  async exportMemberLevels(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const levels = await this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.enterpriseId, req.user.enterpriseId),
          eq(schema.memberLevels.isDeleted, false),
        ),
      )
      .orderBy(schema.memberLevels.sortOrder);

    const columns = [
      { key: 'name', header: '等级名称', width: 15 },
      { key: 'code', header: '等级代码', width: 12 },
      { key: 'minPoints', header: '最低积分', width: 12 },
      { key: 'maxPoints', header: '最高积分', width: 12 },
      { key: 'discountRate', header: '折扣率', width: 10 },
      { key: 'description', header: '描述', width: 30 },
      { key: 'color', header: '颜色', width: 10 },
      { key: 'sortOrder', header: '排序', width: 8 },
      { key: 'isDefault', header: '默认', width: 8 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, levels, columns, '会员等级');

    const filename = `member_levels_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('customer_categories')
  @Permissions(Permission.CRM_READ)
  async exportCustomerCategories(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const categories = await this.db
      .select()
      .from(schema.customerCategories)
      .where(
        and(
          eq(schema.customerCategories.enterpriseId, req.user.enterpriseId),
          eq(schema.customerCategories.isDeleted, false),
        ),
      )
      .orderBy(schema.customerCategories.sortOrder);

    const columns = [
      { key: 'name', header: '分类名称', width: 15 },
      { key: 'type', header: '分类类型', width: 12 },
      { key: 'description', header: '描述', width: 30 },
      { key: 'color', header: '颜色', width: 10 },
      { key: 'sortOrder', header: '排序', width: 8 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, categories, columns, '客户分类');

    const filename = `customer_categories_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('employee_profiles')
  @Permissions(Permission.OA_READ)
  async exportEmployeeProfiles(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const profiles = await this.db
      .select({
        profile: schema.employeeProfiles,
        user: {
          id: schema.users.id,
          phone: schema.users.phone,
          nickname: schema.users.nickname,
        },
      })
      .from(schema.employeeProfiles)
      .innerJoin(schema.users, eq(schema.employeeProfiles.userId, schema.users.id))
      .where(eq(schema.employeeProfiles.enterpriseId, req.user.enterpriseId))
      .orderBy(schema.employeeProfiles.createdAt);

    const data = profiles.map((p) => ({
      userId: p.user.id,
      nickname: p.user.nickname,
      phone: p.user.phone,
      department: p.profile.department,
      position: p.profile.position,
      employeeNo: p.profile.employeeNo,
      email: p.profile.email,
      joinDate: p.profile.joinDate,
      createdAt: p.profile.createdAt,
    }));

    const columns = [
      { key: 'userId', header: '用户ID', width: 10 },
      { key: 'nickname', header: '姓名', width: 15 },
      { key: 'phone', header: '电话', width: 15 },
      { key: 'department', header: '部门', width: 15 },
      { key: 'position', header: '职位', width: 15 },
      { key: 'employeeNo', header: '员工号', width: 12 },
      { key: 'email', header: '邮箱', width: 25 },
      { key: 'joinDate', header: '入职日期', width: 12 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, data, columns, '员工档案');

    const filename = `employee_profiles_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('vouchers')
  @Permissions(Permission.FIN_READ)
  async exportVouchers(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let conditions = eq(schema.voucherEntries.enterpriseId, req.user.enterpriseId);

    if (startDate && endDate) {
      conditions = and(
        conditions,
        gte(schema.voucherEntries.entryDate, new Date(startDate)),
        lte(schema.voucherEntries.entryDate, new Date(endDate)),
      ) as any;
    }

    const vouchers = await this.db.select().from(schema.voucherEntries).where(conditions);

    const columns = [
      { key: 'voucherNo', header: '凭证号', width: 20 },
      { key: 'sourceType', header: '来源类型', width: 12 },
      { key: 'entryDate', header: '日期', width: 12 },
      { key: 'debitAccount', header: '借方科目', width: 15 },
      { key: 'creditAccount', header: '贷方科目', width: 15 },
      { key: 'amount', header: '金额', width: 12 },
      { key: 'summary', header: '摘要', width: 30 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, vouchers, columns, '凭证列表');

    const filename = `vouchers_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('audit-logs')
  @Permissions(Permission.SYS_AUDIT_LOG)
  async exportAuditLogs(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('method') method?: string,
    @Query('pathPrefix') pathPrefix?: string,
    @Query('userId') userIdRaw?: string,
    @Query('maxRows') maxRowsRaw?: string,
  ) {
    const capped = Math.min(
      50_000,
      Math.max(1, Number.parseInt(maxRowsRaw ?? '5000', 10) || 5000),
    );
    const parsedUserId =
      userIdRaw !== undefined && userIdRaw !== ''
        ? Number(userIdRaw)
        : undefined;

    const rows = await this.auditLogService.listAllForExport({
      enterpriseId: req.user.enterpriseId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      method: method ? method.toUpperCase() : undefined,
      pathPrefix,
      userId:
        parsedUserId !== undefined && Number.isInteger(parsedUserId)
          ? parsedUserId
          : undefined,
      maxRows: capped,
    });

    const data = rows.map((r) => ({
      id: r.id,
      userId: r.userId ?? '',
      method: r.method,
      path: r.path,
      ip: r.ip ?? '',
      statusCode: r.statusCode ?? '',
      durationMs: r.durationMs ?? '',
      requestBody: r.requestBody ?? '',
      userAgent: (r.userAgent ?? '').slice(0, 500),
      createdAt: r.createdAt.toISOString(),
    }));

    const columns = [
      { key: 'id', header: 'ID', width: 8 },
      { key: 'userId', header: '用户ID', width: 10 },
      { key: 'method', header: '方法', width: 10 },
      { key: 'path', header: '路径', width: 45 },
      { key: 'ip', header: 'IP', width: 18 },
      { key: 'statusCode', header: '状态码', width: 10 },
      { key: 'durationMs', header: '耗时(ms)', width: 12 },
      { key: 'requestBody', header: '请求体摘要', width: 45 },
      { key: 'userAgent', header: 'UA摘要', width: 40 },
      { key: 'createdAt', header: '时间', width: 24 },
    ];

    const result = this.exportService.export(
      format,
      data,
      columns,
      '操作审计',
    );

    const filename = `audit_logs_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  // ==================== 财务报表（Excel / CSV，数据来自 FinanceService）====================

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出资产负债表（Excel / CSV）',
    description:
      '数据源与 **GET /finance/reports/balance-sheet**（`getBalanceSheet`）一致。\n\n' +
      '- **excel**：三工作表「资产 / 负债 / 所有者权益」，列为科目的 code、name、amount，表末为对应合计。\n' +
      '- **csv**：单表，增加列「报表段落」区分资产 / 负债 / 所有者权益。\n' +
      '- **format** 仅支持 `excel`、`csv`（不可用 `pdf`）。\n\n' +
      '权限：`finance:report`（FIN_REPORT）。',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv; charset=utf-8',
  )
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['excel', 'csv'],
    description: '默认 excel',
  })
  @ApiQuery({
    name: 'asOfDate',
    required: false,
    example: '2026-05-08',
    description: '截止日期 YYYY-MM-DD，同报表接口',
  })
  @Get('finance/balance-sheet')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceBalanceSheet(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('asOfDate') asOfDate?: string,
  ) {
    const report = await this.financeService.getBalanceSheet(
      enterpriseIdFromRequest(req),
      asOfDate,
    );
    const ts = Date.now();
    if (format === 'excel') {
      const buf = this.exportService.exportExcelWorkbook(
        balanceSheetExcelWorkbook(report),
      );
      res.setHeader(
        'Content-Type',
        this.exportService.getMimeType('excel'),
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="finance_balance_sheet_${ts}.xlsx"`,
      );
      res.send(buf);
      return;
    }
    const rows = balanceSheetCsvRows(report);
    const result = this.exportService.export(
      format,
      rows,
      balanceSheetCsvColumns,
      '资产负债表',
    );
    const filename = `finance_balance_sheet_${ts}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出利润表（Excel / CSV）',
    description:
      '数据源与 **GET /finance/reports/income-statement**（`getIncomeStatement`）一致。\n\n' +
      '- 单工作表/单表：列含报表段落（营业收入 / 营业成本 / 期间费用 / 合计）、科目编码、名称、本期金额；含各段小计与净利润行。\n' +
      '- **format**：`excel` | `csv`。权限：`finance:report`。',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv; charset=utf-8',
  )
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['excel', 'csv'],
    description: '默认 excel',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    example: '2026-05',
    description: '会计期间 YYYY-MM，同报表接口',
  })
  @Get('finance/income-statement')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceIncomeStatement(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('period') period?: string,
  ) {
    const report = await this.financeService.getIncomeStatement(
      enterpriseIdFromRequest(req),
      period,
    );
    const data = incomeStatementExcelRows(report);
    const result = this.exportService.export(
      format,
      data,
      incomeStatementExcelColumns,
      '利润表',
    );
    const filename = `finance_income_statement_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出现金流量表（Excel / CSV）',
    description:
      '数据源与 **GET /finance/reports/cash-flow**（`getCashFlow`）一致。\n\n' +
      '- 单表：经营活动 / 投资活动 / 筹资活动明细与净额，以及期初、期末现金与现金净增加额。\n' +
      '- **format**：`excel` | `csv`。权限：`finance:report`。',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv; charset=utf-8',
  )
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['excel', 'csv'],
    description: '默认 excel',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    example: '2026-05',
    description: '会计期间 YYYY-MM',
  })
  @Get('finance/cash-flow')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceCashFlow(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('period') period?: string,
  ) {
    const report = await this.financeService.getCashFlow(
      enterpriseIdFromRequest(req),
      period,
    );
    const data = cashFlowExcelRows(report);
    const result = this.exportService.export(
      format,
      data,
      cashFlowExcelColumns,
      '现金流量表',
    );
    const filename = `finance_cash_flow_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出应收应付明细（Excel / CSV）',
    description:
      '数据源与 **GET /finance/reports/ar-ap**（`getArAp`）一致。\n\n' +
      '- **excel**：三工作表「应收账款 / 应付账款 / 汇总」；明细列：发票ID、往来单位、发票号码、价税合计、已收或已付、余额、开票日期、逾期天数。\n' +
      '- **csv**：单表，列「类型」区分应收 / 应付。\n' +
      '- **format**：`excel` | `csv`。权限：`finance:report`。',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv; charset=utf-8',
  )
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['excel', 'csv'],
    description: '默认 excel',
  })
  @Get('finance/ar-ap')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceArAp(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
  ) {
    const report = await this.financeService.getArAp(enterpriseIdFromRequest(req));
    const ts = Date.now();
    if (format === 'excel') {
      const buf = this.exportService.exportExcelWorkbook(arApExcelWorkbook(report));
      res.setHeader(
        'Content-Type',
        this.exportService.getMimeType('excel'),
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="finance_ar_ap_${ts}.xlsx"`,
      );
      res.send(buf);
      return;
    }
    const rows = arApCsvRows(report);
    const result = this.exportService.export(format, rows, arApCsvColumns, '应收应付');
    const filename = `finance_ar_ap_${ts}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }

  @Get('opportunities')
  @Permissions(Permission.CRM_READ)
  async exportOpportunities(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('format') format: ExportFormat = 'excel',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    let conditions = and(
      eq(schema.opportunities.enterpriseId, req.user.enterpriseId),
      eq(schema.opportunities.isDeleted, false),
    );

    if (status) {
      conditions = and(conditions, eq(schema.opportunities.status, status)) as any;
    }

    const opportunities = await this.db
      .select({
        opportunity: schema.opportunities,
        customerName: schema.customers.name,
      })
      .from(schema.opportunities)
      .leftJoin(schema.customers, eq(schema.opportunities.customerId, schema.customers.id))
      .where(conditions);

    // 如果有搜索条件，在前端过滤
    let data = opportunities.map(({ opportunity, customerName }) => ({
      ...opportunity,
      customerName: customerName || '',
    }));

    if (search?.trim()) {
      const keyword = search.trim().toLowerCase();
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(keyword) ||
          item.customerName.toLowerCase().includes(keyword),
      );
    }

    const columns = [
      { key: 'name', header: '商机名称', width: 25 },
      { key: 'customerName', header: '客户', width: 20 },
      { key: 'status', header: '状态', width: 12 },
      { key: 'estimatedAmount', header: '预计金额', width: 15 },
      { key: 'actualAmount', header: '实际金额', width: 15 },
      { key: 'probability', header: '概率(%)', width: 10 },
      { key: 'expectedCloseAt', header: '预计成交日期', width: 18 },
      { key: 'actualCloseAt', header: '实际成交日期', width: 18 },
      { key: 'assignedTo', header: '负责人ID', width: 12 },
      { key: 'remark', header: '备注', width: 30 },
      { key: 'createdAt', header: '创建时间', width: 20 },
    ];

    const result = this.exportService.export(format, data, columns, '商机列表');

    const filename = `opportunities_${Date.now()}.${this.exportService.getFileExtension(format)}`;
    res.setHeader('Content-Type', this.exportService.getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  }
}
