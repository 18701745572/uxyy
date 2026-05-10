import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { AutoAccountingService } from '../../finance/services/auto-accounting.service';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作付款记录');
  }
  return enterpriseId;
}

export interface CreateSupplierPaymentDto {
  supplierId: number;
  orderId?: number;
  amount: string | number;
  paymentMethod: 'cash' | 'bank' | 'alipay' | 'wechat';
  paymentDate?: string;
  referenceNo?: string;
  remark?: string;
}

export interface UpdateSupplierPaymentDto {
  amount?: string | number;
  paymentMethod?: 'cash' | 'bank' | 'alipay' | 'wechat';
  paymentDate?: string;
  referenceNo?: string;
  remark?: string;
}

@Injectable()
export class SupplierPaymentService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly autoAccountingService: AutoAccountingService,
  ) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    supplierId?: number;
    orderId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.supplierPayments.enterpriseId, eid),
    ];
    if (params.supplierId) {
      conditions.push(eq(schema.supplierPayments.supplierId, params.supplierId));
    }
    if (params.orderId) {
      conditions.push(eq(schema.supplierPayments.orderId, params.orderId));
    }

    let dateCondition = undefined;
    if (params.startDate && params.endDate) {
      dateCondition = and(
        gte(schema.supplierPayments.paymentDate, new Date(params.startDate)),
        lte(schema.supplierPayments.paymentDate, new Date(params.endDate)),
      );
    } else if (params.startDate) {
      dateCondition = gte(schema.supplierPayments.paymentDate, new Date(params.startDate));
    } else if (params.endDate) {
      dateCondition = lte(schema.supplierPayments.paymentDate, new Date(params.endDate));
    }

    const whereClause = dateCondition ? and(...conditions, dateCondition) : and(...conditions);

    const [data, totalResult, sumResult] = await Promise.all([
      this.db
        .select({
          record: schema.supplierPayments,
          supplierName: schema.suppliers.name,
        })
        .from(schema.supplierPayments)
        .leftJoin(schema.suppliers, eq(schema.supplierPayments.supplierId, schema.suppliers.id))
        .where(whereClause)
        .orderBy(desc(schema.supplierPayments.paymentDate))
        .limit(params.pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.supplierPayments)
        .where(whereClause),
      this.db
        .select({
          total: sql<string>`COALESCE(SUM(${schema.supplierPayments.amount}), '0')`,
        })
        .from(schema.supplierPayments)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      data: data.map(({ record, supplierName }) => ({
        id: record.id,
        enterpriseId: record.enterpriseId,
        supplierId: record.supplierId,
        supplierName: supplierName || '',
        orderId: record.orderId ?? null,
        orderNo: record.orderNo ?? null,
        amount: record.amount,
        paymentMethod: record.paymentMethod,
        paymentDate: record.paymentDate.toISOString(),
        referenceNo: record.referenceNo ?? null,
        remark: record.remark ?? null,
        createdBy: record.createdBy ?? null,
        createdAt: record.createdAt.toISOString(),
      })),
      total,
      totalAmount: sumResult[0]?.total ?? '0',
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [result] = await this.db
      .select({
        record: schema.supplierPayments,
        supplierName: schema.suppliers.name,
      })
      .from(schema.supplierPayments)
      .leftJoin(schema.suppliers, eq(schema.supplierPayments.supplierId, schema.suppliers.id))
      .where(
        and(
          eq(schema.supplierPayments.id, id),
          eq(schema.supplierPayments.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!result) throw new NotFoundException('付款记录不存在');

    const { record, supplierName } = result;

    return {
      id: record.id,
      enterpriseId: record.enterpriseId,
      supplierId: record.supplierId,
      supplierName: supplierName || '',
      orderId: record.orderId ?? null,
      orderNo: record.orderNo ?? null,
      amount: record.amount,
      paymentMethod: record.paymentMethod,
      paymentDate: record.paymentDate.toISOString(),
      referenceNo: record.referenceNo ?? null,
      remark: record.remark ?? null,
      createdBy: record.createdBy ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async create(
    enterpriseId: number | undefined,
    dto: CreateSupplierPaymentDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    // 验证供应商是否存在
    const [supplier] = await this.db
      .select()
      .from(schema.suppliers)
      .where(
        and(
          eq(schema.suppliers.id, dto.supplierId),
          eq(schema.suppliers.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!supplier) {
      throw new NotFoundException('供应商不存在');
    }

    // 如果关联了订单，验证订单是否存在
    let orderNo: string | null = null;
    if (dto.orderId) {
      const [order] = await this.db
        .select()
        .from(schema.purchaseOrders)
        .where(
          and(
            eq(schema.purchaseOrders.id, dto.orderId),
            eq(schema.purchaseOrders.enterpriseId, eid),
          ),
        )
        .limit(1);

      if (!order) {
        throw new NotFoundException('采购订单不存在');
      }

      orderNo = order.orderNo;

      // 验证订单是否属于该供应商
      if (order.supplierId !== dto.supplierId) {
        throw new BadRequestException('订单不属于该供应商');
      }
    }

    const [record] = await this.db
      .insert(schema.supplierPayments)
      .values({
        enterpriseId: eid,
        supplierId: dto.supplierId,
        orderId: dto.orderId ?? null,
        orderNo,
        amount: dto.amount.toString(),
        paymentMethod: dto.paymentMethod,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        referenceNo: dto.referenceNo ?? null,
        remark: dto.remark ?? null,
        createdBy: userId,
      })
      .returning();

    const result = await this.findOne(record.id, enterpriseId);

    // 自动生成付款凭证：借 应付账款 / 贷 银行存款
    try {
      await this.autoAccountingService.autoAccountPaymentMade(
        { ...result, supplierName: supplier.name },
        eid,
        userId,
      );
    } catch (err) {
      console.error('付款自动记账失败:', err);
    }

    // 检查订单是否满足完成条件：入库完成 + 付款完成
    if (dto.orderId) {
      try {
        const paymentStats = await this.getOrderPaymentStats(dto.orderId, enterpriseId);
        if (paymentStats.isFullyPaid) {
          const [order] = await this.db
            .select()
            .from(schema.purchaseOrders)
            .where(eq(schema.purchaseOrders.id, dto.orderId))
            .limit(1);

          if (order && order.status === 'approved') {
            await this.db
              .update(schema.purchaseOrders)
              .set({
                status: 'completed',
                completedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(schema.purchaseOrders.id, dto.orderId));
          }
        }
      } catch (err) {
        console.error('检查订单完成状态失败:', err);
      }
    }

    return result;
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateSupplierPaymentDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    const patch: Record<string, unknown> = {};
    if (dto.amount !== undefined) patch.amount = dto.amount.toString();
    if (dto.paymentMethod !== undefined) patch.paymentMethod = dto.paymentMethod;
    if (dto.paymentDate !== undefined) patch.paymentDate = new Date(dto.paymentDate);
    if (dto.referenceNo !== undefined) patch.referenceNo = dto.referenceNo || null;
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.supplierPayments)
      .set(patch)
      .where(
        and(
          eq(schema.supplierPayments.id, id),
          eq(schema.supplierPayments.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('付款记录不存在');
    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    await this.db
      .delete(schema.supplierPayments)
      .where(
        and(
          eq(schema.supplierPayments.id, id),
          eq(schema.supplierPayments.enterpriseId, eid),
        ),
      );

    return { ok: true };
  }

  /**
   * 获取供应商的付款统计
   */
  async getSupplierPaymentStats(supplierId: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [result] = await this.db
      .select({
        totalPayments: sql<string>`COALESCE(SUM(${schema.supplierPayments.amount}), '0')`,
        paymentCount: count(),
      })
      .from(schema.supplierPayments)
      .where(
        and(
          eq(schema.supplierPayments.supplierId, supplierId),
          eq(schema.supplierPayments.enterpriseId, eid),
        ),
      );

    return {
      supplierId,
      totalPayments: result?.totalPayments ?? '0',
      paymentCount: Number(result?.paymentCount ?? 0),
    };
  }

  /**
   * 获取订单的付款统计
   */
  async getOrderPaymentStats(orderId: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [result] = await this.db
      .select({
        totalPayments: sql<string>`COALESCE(SUM(${schema.supplierPayments.amount}), '0')`,
        paymentCount: count(),
      })
      .from(schema.supplierPayments)
      .where(
        and(
          eq(schema.supplierPayments.orderId, orderId),
          eq(schema.supplierPayments.enterpriseId, eid),
        ),
      );

    // 获取订单金额
    const [order] = await this.db
      .select({ totalAmount: schema.purchaseOrders.totalAmount })
      .from(schema.purchaseOrders)
      .where(
        and(
          eq(schema.purchaseOrders.id, orderId),
          eq(schema.purchaseOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    const totalPayments = result?.totalPayments ?? '0';
    const orderAmount = order?.totalAmount ?? '0';
    const remainingAmount = (parseFloat(orderAmount) - parseFloat(totalPayments)).toFixed(2);

    return {
      orderId,
      orderAmount,
      totalPayments,
      remainingAmount: Math.max(0, parseFloat(remainingAmount)).toFixed(2),
      paymentCount: Number(result?.paymentCount ?? 0),
      isFullyPaid: parseFloat(remainingAmount) <= 0,
    };
  }

  /**
   * 获取应付账款余额统计（按供应商）
   */
  async getAccountsPayableStats(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    // 获取所有已审批的采购订单金额
    const ordersResult = await this.db
      .select({
        supplierId: schema.purchaseOrders.supplierId,
        totalOrderAmount: sql<string>`SUM(${schema.purchaseOrders.totalAmount})`,
      })
      .from(schema.purchaseOrders)
      .where(
        and(
          eq(schema.purchaseOrders.enterpriseId, eid),
          sql`${schema.purchaseOrders.status} = 'approved'::order_status`,
        ),
      )
      .groupBy(schema.purchaseOrders.supplierId);

    // 获取所有供应商付款金额
    const paymentsResult = await this.db
      .select({
        supplierId: schema.supplierPayments.supplierId,
        totalPaidAmount: sql<string>`SUM(${schema.supplierPayments.amount})`,
      })
      .from(schema.supplierPayments)
      .where(eq(schema.supplierPayments.enterpriseId, eid))
      .groupBy(schema.supplierPayments.supplierId);

    // 合并数据
    const ordersMap = new Map<number, string>();
    ordersResult.forEach((row) => {
      ordersMap.set(row.supplierId, row.totalOrderAmount);
    });

    const paymentsMap = new Map<number, string>();
    paymentsResult.forEach((row) => {
      paymentsMap.set(row.supplierId, row.totalPaidAmount);
    });

    const allSupplierIds = new Set([...ordersMap.keys(), ...paymentsMap.keys()]);

    const results = await Promise.all(
      Array.from(allSupplierIds).map(async (supplierId) => {
        const [supplier] = await this.db
          .select({ name: schema.suppliers.name })
          .from(schema.suppliers)
          .where(
            and(
              eq(schema.suppliers.id, supplierId),
              eq(schema.suppliers.enterpriseId, eid),
            ),
          )
          .limit(1);

        const orderAmount = ordersMap.get(supplierId) ?? '0';
        const paidAmount = paymentsMap.get(supplierId) ?? '0';
        const payableAmount = (parseFloat(orderAmount) - parseFloat(paidAmount)).toFixed(2);

        return {
          supplierId,
          supplierName: supplier?.name || '未知供应商',
          totalOrderAmount: orderAmount,
          totalPaidAmount: paidAmount,
          payableAmount: Math.max(0, parseFloat(payableAmount)).toFixed(2),
        };
      }),
    );

    // 计算总计
    const totalOrderAmount = results.reduce((sum, r) => sum + parseFloat(r.totalOrderAmount), 0);
    const totalPaidAmount = results.reduce((sum, r) => sum + parseFloat(r.totalPaidAmount), 0);
    const totalPayableAmount = results.reduce((sum, r) => sum + parseFloat(r.payableAmount), 0);

    return {
      total: {
        totalOrderAmount: totalOrderAmount.toFixed(2),
        totalPaidAmount: totalPaidAmount.toFixed(2),
        payableAmount: totalPayableAmount.toFixed(2),
      },
      bySupplier: results.filter((r) => parseFloat(r.payableAmount) > 0),
    };
  }

  /**
   * 获取应付账款账龄分析
   */
  async getAccountsPayableAging(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    // 获取已审批但未完全付款的订单
    const orders = await this.db
      .select({
        id: schema.purchaseOrders.id,
        supplierId: schema.purchaseOrders.supplierId,
        supplierName: schema.suppliers.name,
        orderNo: schema.purchaseOrders.orderNo,
        totalAmount: schema.purchaseOrders.totalAmount,
        createdAt: schema.purchaseOrders.createdAt,
      })
      .from(schema.purchaseOrders)
      .leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplierId, schema.suppliers.id))
      .where(
        and(
          eq(schema.purchaseOrders.enterpriseId, eid),
          sql`${schema.purchaseOrders.status} = 'approved'::order_status`,
        ),
      );

    // 获取订单付款总额
    const paymentsResult = await this.db
      .select({
        orderId: schema.supplierPayments.orderId,
        totalPaid: sql<string>`COALESCE(SUM(${schema.supplierPayments.amount}), '0')`,
      })
      .from(schema.supplierPayments)
      .where(eq(schema.supplierPayments.enterpriseId, eid))
      .groupBy(schema.supplierPayments.orderId);

    const paymentsMap = new Map<number, string>();
    paymentsResult.forEach((row) => {
      if (row.orderId) {
        paymentsMap.set(row.orderId, row.totalPaid);
      }
    });

    const today = new Date();
    const result = orders.map((order) => {
      const totalPaid = paymentsMap.get(order.id) ?? '0';
      const payableAmount = (parseFloat(order.totalAmount) - parseFloat(totalPaid)).toFixed(2);

      if (parseFloat(payableAmount) <= 0) return null;

      const createdDate = new Date(order.createdAt);
      const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      let agingBucket: string;
      if (daysDiff <= 30) agingBucket = '0-30天';
      else if (daysDiff <= 60) agingBucket = '31-60天';
      else if (daysDiff <= 90) agingBucket = '61-90天';
      else agingBucket = '90天以上';

      return {
        orderId: order.id,
        orderNo: order.orderNo,
        supplierId: order.supplierId,
        supplierName: order.supplierName,
        totalAmount: order.totalAmount,
        totalPaid,
        payableAmount,
        daysAging: daysDiff,
        agingBucket,
        createdAt: order.createdAt.toISOString(),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    // 按账龄分组统计
    const bucketStats: Record<string, { count: number; amount: number }> = {
      '0-30天': { count: 0, amount: 0 },
      '31-60天': { count: 0, amount: 0 },
      '61-90天': { count: 0, amount: 0 },
      '90天以上': { count: 0, amount: 0 },
    };

    result.forEach((item) => {
      if (bucketStats[item.agingBucket]) {
        bucketStats[item.agingBucket].count++;
        bucketStats[item.agingBucket].amount += parseFloat(item.payableAmount);
      }
    });

    const totalPayable = result.reduce((sum, r) => sum + parseFloat(r.payableAmount), 0);

    return {
      totalPayable: totalPayable.toFixed(2),
      bucketStats: Object.entries(bucketStats).map(([bucket, stats]) => ({
        bucket,
        count: stats.count,
        amount: stats.amount.toFixed(2),
        percentage: totalPayable > 0 ? ((stats.amount / totalPayable) * 100).toFixed(1) : '0',
      })),
      details: result,
    };
  }
}