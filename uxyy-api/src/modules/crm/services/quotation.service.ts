import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作报价单');
  }
  return enterpriseId;
}

function genQuotationNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hex = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase();
  return `BJ${y}${m}${d}${hex}`;
}

function mapQuotationRow(
  row: typeof schema.quotations.$inferSelect,
  items: ReturnType<typeof mapItemRow>[] = [],
) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    customerId: row.customerId,
    opportunityId: row.opportunityId ?? null,
    quotationNo: row.quotationNo,
    title: row.title,
    status: row.status,
    totalAmount: row.totalAmount,
    discountAmount: row.discountAmount ?? '0',
    taxRate: row.taxRate ?? '0',
    taxAmount: row.taxAmount ?? '0',
    payableAmount: row.payableAmount,
    validUntil: row.validUntil?.toISOString() ?? null,
    remark: row.remark ?? null,
    pdfUrl: row.pdfUrl ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

function mapItemRow(row: typeof schema.quotationItems.$inferSelect) {
  return {
    id: row.id,
    quotationId: row.quotationId,
    productId: row.productId ?? null,
    productName: row.productName,
    specification: row.specification ?? null,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    discountRate: row.discountRate ?? '100',
    amount: row.amount,
    remark: row.remark ?? null,
    sortOrder: row.sortOrder ?? 0,
  };
}

export interface CreateQuotationDto {
  customerId: number;
  opportunityId?: number;
  title: string;
  validUntil?: string;
  remark?: string;
  items: {
    productId?: number;
    productName: string;
    specification?: string;
    quantity: string | number;
    unitPrice: string | number;
    discountRate?: string | number;
    remark?: string;
  }[];
}

export interface UpdateQuotationDto {
  title?: string;
  validUntil?: string;
  remark?: string;
}

export interface SendQuotationDto {
  email?: string;
  phone?: string;
}

@Injectable()
export class QuotationService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  async findPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
    customerId?: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.quotations.enterpriseId, eid),
      eq(schema.quotations.isDeleted, false),
    ];
    if (params.status) {
      conditions.push(sql`${schema.quotations.status} = ${params.status}::quotation_status`);
    }
    if (params.customerId) {
      conditions.push(eq(schema.quotations.customerId, params.customerId));
    }

    const whereClause = and(...conditions);

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(schema.quotations)
        .where(whereClause)
        .orderBy(desc(schema.quotations.createdAt))
        .limit(params.pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(schema.quotations)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      data: data.map((row) => mapQuotationRow(row)),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
    };
  }

  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.quotations)
      .where(
        and(
          eq(schema.quotations.id, id),
          eq(schema.quotations.enterpriseId, eid),
          eq(schema.quotations.isDeleted, false),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundException('报价单不存在');

    const items = await this.db
      .select()
      .from(schema.quotationItems)
      .where(eq(schema.quotationItems.quotationId, id))
      .orderBy(schema.quotationItems.sortOrder);

    return mapQuotationRow(row, items.map(mapItemRow));
  }

  async create(
    enterpriseId: number | undefined,
    dto: CreateQuotationDto,
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

    // 计算金额
    let totalAmount = 0;
    const itemsData = dto.items.map((item, index) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discountRate = item.discountRate ? Number(item.discountRate) : 100;
      const amount = quantity * unitPrice * (discountRate / 100);
      totalAmount += amount;

      return {
        productId: item.productId,
        productName: item.productName,
        specification: item.specification,
        quantity: quantity.toFixed(2),
        unitPrice: unitPrice.toFixed(2),
        discountRate: discountRate.toFixed(2),
        amount: amount.toFixed(2),
        remark: item.remark,
        sortOrder: index,
      };
    });

    const taxRate = 0;
    const taxAmount = totalAmount * (taxRate / 100);
    const payableAmount = totalAmount + taxAmount;

    // 创建报价单
    const [quotation] = await this.db
      .insert(schema.quotations)
      .values({
        enterpriseId: eid,
        customerId: dto.customerId,
        opportunityId: dto.opportunityId ?? null,
        quotationNo: genQuotationNo(),
        title: dto.title,
        status: 'draft',
        totalAmount: totalAmount.toFixed(2),
        discountAmount: '0',
        taxRate: taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        payableAmount: payableAmount.toFixed(2),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        remark: dto.remark ?? null,
        createdBy: userId,
      })
      .returning();

    // 创建明细
    if (itemsData.length > 0) {
      await this.db.insert(schema.quotationItems).values(
        itemsData.map((item) => ({
          ...item,
          quotationId: quotation.id,
        })),
      );
    }

    return this.findOne(quotation.id, enterpriseId);
  }

  async update(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateQuotationDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const quotation = await this.findOne(id, enterpriseId);

    if (quotation.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的报价单可修改');
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.validUntil !== undefined) patch.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.remark !== undefined) patch.remark = dto.remark || null;

    const [updated] = await this.db
      .update(schema.quotations)
      .set(patch)
      .where(
        and(
          eq(schema.quotations.id, id),
          eq(schema.quotations.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('报价单不存在');
    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const quotation = await this.findOne(id, enterpriseId);

    if (quotation.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的报价单可删除');
    }

    const [updated] = await this.db
      .update(schema.quotations)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.quotations.id, id),
          eq(schema.quotations.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('报价单不存在');
    return { ok: true };
  }

  async send(
    id: number,
    enterpriseId: number | undefined,
    dto: SendQuotationDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const quotation = await this.findOne(id, enterpriseId);

    if (quotation.status !== 'draft') {
      throw new BadRequestException('仅草稿状态的报价单可发送');
    }

    // TODO: 生成 PDF 并发送邮件/短信
    // 这里先更新状态为已发送

    const [updated] = await this.db
      .update(schema.quotations)
      .set({ status: 'sent', updatedAt: new Date() })
      .where(
        and(
          eq(schema.quotations.id, id),
          eq(schema.quotations.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('报价单不存在');
    return this.findOne(id, enterpriseId);
  }

  async updateStatus(
    id: number,
    enterpriseId: number | undefined,
    status: 'accepted' | 'rejected' | 'expired',
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const quotation = await this.findOne(id, enterpriseId);

    if (quotation.status !== 'sent') {
      throw new BadRequestException('仅已发送状态的报价单可更新此状态');
    }

    const [updated] = await this.db
      .update(schema.quotations)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(schema.quotations.id, id),
          eq(schema.quotations.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('报价单不存在');

    // 如果报价单被接受，更新关联商机的状态
    if (status === 'accepted' && quotation.opportunityId) {
      await this.db
        .update(schema.opportunities)
        .set({ status: 'quotation', updatedAt: new Date() })
        .where(eq(schema.opportunities.id, quotation.opportunityId));
    }

    return this.findOne(id, enterpriseId);
  }

  async convertToSalesOrder(
    id: number,
    enterpriseId: number | undefined,
    userId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const quotation = await this.findOne(id, enterpriseId);

    if (quotation.status !== 'accepted') {
      throw new BadRequestException('仅已接受的报价单可转为销售单');
    }

    // 返回报价单数据，供销售单创建使用
    return {
      ok: true,
      quotation,
      message: '请使用此数据创建销售单',
    };
  }
}
