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

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作回款记录');
  }
  return enterpriseId;
}

export interface CreatePaymentRecordDto {
  customerId: number;
  orderId?: number;
  amount: string | number;
  paymentMethod: 'cash' | 'bank' | 'alipay' | 'wechat';
  paymentDate?: string;
  referenceNo?: string;
  remark?: string;
}

export interface UpdatePaymentRecordDto {
  amount?: string | number;
  paymentMethod?: 'cash' | 'bank' | 'alipay' | 'wechat';
  paymentDate?: string;
  referenceNo?: string;
  remark?: string;
}

@Injectable()
export class PaymentRecordService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    customerId?: number;
    orderId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.paymentRecords.enterpriseId, eid),
    ];
    if (params.customerId) {
      conditions.push(eq(schema.paymentRecords.customerId, params.customerId));
    }
    if (params.orderId) {
      conditions.push(eq(schema.paymentRecords.orderId, params.orderId));
    }

    let dateCondition = undefined;
    if (params.startDate && params.endDate) {
      dateCondition = and(
        gte(schema.paymentRecords.paymentDate, new Date(params.startDate)),
        lte(schema.paymentRecords.paymentDate, new Date(params.endDate)),
      );
    } else if (params.startDate) {
      dateCondition = gte(schema.paymentRecords.paymentDate, new Date(params.startDate));
    } else if (params.endDate) {
      dateCondition = lte(schema.paymentRecords.paymentDate, new Date(params.endDate));
    }

    const whereClause = dateCondition ? and(...conditions, dateCondition) : and(...conditions);

    const [data, totalResult, sumResult] = await Promise.all([
      this.db
        .select({
          record: schema.paymentRecords,
          customerName: schema.customers.name,
        })
        .from(schema.paymentRecords)
        .leftJoin(schema.customers, eq(schema.paymentRecords.customerId, schema.customers.id))
        .where(whereClause)
        .orderBy(desc(schema.paymentRecords.paymentDate))
        .limit(params.pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.paymentRecords)
        .where(whereClause),
      this.db
        .select({
          total: sql<string>`COALESCE(SUM(${schema.paymentRecords.amount}), '0')`,
        })
        .from(schema.paymentRecords)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      data: data.map(({ record, customerName }) => ({
        id: record.id,
        enterpriseId: record.enterpriseId,
        customerId: record.customerId,
        customerName: customerName || '',
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
        record: schema.paymentRecords,
        customerName: schema.customers.name,
      })
      .from(schema.paymentRecords)
      .leftJoin(schema.customers, eq(schema.paymentRecords.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.paymentRecords.id, id),
          eq(schema.paymentRecords.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!result) throw new NotFoundException('回款记录不存在');

    const { record, customerName } = result;

    return {
      id: record.id,
      enterpriseId: record.enterpriseId,
      customerId: record.customerId,
      customerName: customerName || '',
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
    dto: CreatePaymentRecordDto,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    // 验证客户是否存在
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, dto.customerId),
          eq(schema.customers.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!customer) {
      throw new BadRequestException('客户不存在');
    }

    // 如果关联了订单，验证订单是否存在
    let orderNo: string | null = null;
    if (dto.orderId) {
      const [order] = await this.db
        .select()
        .from(schema.salesOrders)
        .where(
          and(
            eq(schema.salesOrders.id, dto.orderId),
            eq(schema.salesOrders.enterpriseId, eid),
          ),
        )
        .limit(1);

      if (!order) {
        throw new BadRequestException('销售订单不存在');
      }

      orderNo = order.orderNo;

      // 验证订单是否属于该客户
      if (order.customerId !== dto.customerId) {
        throw new BadRequestException('订单不属于该客户');
      }
    }

    const [record] = await this.db
      .insert(schema.paymentRecords)
      .values({
        enterpriseId: eid,
        customerId: dto.customerId,
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

    return this.findOne(record.id, enterpriseId);
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdatePaymentRecordDto,
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
      .update(schema.paymentRecords)
      .set(patch)
      .where(
        and(
          eq(schema.paymentRecords.id, id),
          eq(schema.paymentRecords.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('回款记录不存在');
    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    await this.findOne(id, enterpriseId);

    await this.db
      .delete(schema.paymentRecords)
      .where(
        and(
          eq(schema.paymentRecords.id, id),
          eq(schema.paymentRecords.enterpriseId, eid),
        ),
      );

    return { ok: true };
  }

  /**
   * 获取客户的回款统计
   */
  async getCustomerPaymentStats(customerId: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [result] = await this.db
      .select({
        totalPayments: sql<string>`COALESCE(SUM(${schema.paymentRecords.amount}), '0')`,
        paymentCount: count(),
      })
      .from(schema.paymentRecords)
      .where(
        and(
          eq(schema.paymentRecords.customerId, customerId),
          eq(schema.paymentRecords.enterpriseId, eid),
        ),
      );

    return {
      customerId,
      totalPayments: result?.totalPayments ?? '0',
      paymentCount: Number(result?.paymentCount ?? 0),
    };
  }

  /**
   * 获取订单的回款统计
   */
  async getOrderPaymentStats(orderId: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const [result] = await this.db
      .select({
        totalPayments: sql<string>`COALESCE(SUM(${schema.paymentRecords.amount}), '0')`,
        paymentCount: count(),
      })
      .from(schema.paymentRecords)
      .where(
        and(
          eq(schema.paymentRecords.orderId, orderId),
          eq(schema.paymentRecords.enterpriseId, eid),
        ),
      );

    // 获取订单金额
    const [order] = await this.db
      .select({ payableAmount: schema.salesOrders.payableAmount })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.id, orderId),
          eq(schema.salesOrders.enterpriseId, eid),
        ),
      )
      .limit(1);

    const totalPayments = result?.totalPayments ?? '0';
    const orderAmount = order?.payableAmount ?? '0';
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
}
