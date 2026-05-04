import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { count, desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问库存数据');
  }
  return enterpriseId;
}

export interface CreateProductDto {
  name: string;
  code?: string;
  category?: string;
  unit?: string;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  remark?: string;
}

export interface UpdateProductDto {
  name?: string;
  code?: string;
  category?: string;
  unit?: string;
  price?: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  remark?: string;
}

export interface CreatePurchaseOrderDto {
  supplierId?: number;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
  remark?: string;
}

export interface CreateSalesOrderDto {
  customerId?: number;
  items: Array<{
    productId: number;
    quantity: number;
    price: number;
  }>;
  remark?: string;
}

@Injectable()
export class InventoryService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ========== 商品管理 ==========
  async findProductsPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    category?: string;
    keyword?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.products.enterpriseId, eid);

    if (params.category) {
      whereClause = and(
        whereClause,
        eq(schema.products.category, params.category),
      )!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.products)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.products)
      .where(whereClause)
      .orderBy(desc(schema.products.updatedAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.id,
        enterpriseId: r.enterpriseId,
        name: r.name,
        code: r.code,
        category: r.category,
        unit: r.unit,
        price: Number(r.price),
        cost: Number(r.cost),
        stock: r.stock,
        minStock: r.minStock,
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async getProductById(enterpriseId: number | undefined, productId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, productId),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      id: product.id,
      enterpriseId: product.enterpriseId,
      name: product.name,
      code: product.code,
      category: product.category,
      unit: product.unit,
      price: Number(product.price),
      cost: Number(product.cost),
      stock: product.stock,
      minStock: product.minStock,
      remark: product.remark,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  async createProduct(enterpriseId: number | undefined, dto: CreateProductDto) {
    const eid = requireEnterpriseId(enterpriseId);

    const [inserted] = await this.db
      .insert(schema.products)
      .values({
        enterpriseId: eid,
        name: dto.name,
        code: dto.code ?? null,
        category: dto.category ?? null,
        unit: dto.unit ?? '件',
        price: dto.price ? String(dto.price) : '0',
        cost: dto.cost ? String(dto.cost) : '0',
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        remark: dto.remark ?? null,
      })
      .returning();

    return inserted;
  }

  async updateProduct(
    enterpriseId: number | undefined,
    productId: number,
    dto: UpdateProductDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [existing] = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, productId),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const [updated] = await this.db
      .update(schema.products)
      .set({
        name: dto.name ?? existing.name,
        code: dto.code ?? existing.code,
        category: dto.category ?? existing.category,
        unit: dto.unit ?? existing.unit,
        price: dto.price ? String(dto.price) : existing.price,
        cost: dto.cost ? String(dto.cost) : existing.cost,
        stock: dto.stock ?? existing.stock,
        minStock: dto.minStock ?? existing.minStock,
        remark: dto.remark ?? existing.remark,
        updatedAt: new Date(),
      })
      .where(eq(schema.products.id, productId))
      .returning();

    return updated;
  }

  async deleteProduct(enterpriseId: number | undefined, productId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    const [existing] = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, productId),
          eq(schema.products.enterpriseId, eid),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    await this.db
      .delete(schema.products)
      .where(eq(schema.products.id, productId));
    return { success: true };
  }

  // ========== 库存预警 ==========
  async getStockAlerts(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const rows = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.enterpriseId, eid),
          gte(schema.products.minStock, schema.products.stock),
        ),
      );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      stock: r.stock,
      minStock: r.minStock,
      shortage: (r.minStock ?? 0) - (r.stock ?? 0),
    }));
  }

  // ========== 采购订单（带事务） ==========
  async findPurchaseOrdersPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.purchaseOrders.enterpriseId, eid);
    if (params.status) {
      whereClause = and(
        whereClause,
        eq(schema.purchaseOrders.status, params.status),
      )!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.purchaseOrders)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.purchaseOrders)
      .where(whereClause)
      .orderBy(desc(schema.purchaseOrders.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.id,
        orderNo: r.orderNo,
        supplierId: r.supplierId,
        totalAmount: Number(r.totalAmount),
        status: r.status,
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createPurchaseOrder(
    enterpriseId: number | undefined,
    dto: CreatePurchaseOrderDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    // 使用事务确保数据一致性
    return await this.db.transaction(async (trx) => {
      // 1. 验证所有商品是否存在且属于当前企业
      for (const item of dto.items) {
        const [product] = await trx
          .select()
          .from(schema.products)
          .where(
            and(
              eq(schema.products.id, item.productId),
              eq(schema.products.enterpriseId, eid),
            ),
          )
          .limit(1);

        if (!product) {
          throw new NotFoundException(`商品 ID ${item.productId} 不存在`);
        }
      }

      // 2. 生成订单号
      const orderNo = `PO${Date.now()}`;
      const totalAmount = dto.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      // 3. 创建采购订单
      const [order] = await trx
        .insert(schema.purchaseOrders)
        .values({
          enterpriseId: eid,
          orderNo,
          supplierId: dto.supplierId ?? null,
          totalAmount: String(totalAmount),
          status: 'pending',
          remark: dto.remark ?? null,
        })
        .returning();

      return order;
    });
  }

  // ========== 采购入库（带事务） ==========
  async confirmPurchaseOrder(
    enterpriseId: number | undefined,
    orderId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    return await this.db.transaction(async (trx) => {
      // 1. 查询订单
      const [order] = await trx
        .select()
        .from(schema.purchaseOrders)
        .where(
          and(
            eq(schema.purchaseOrders.id, orderId),
            eq(schema.purchaseOrders.enterpriseId, eid),
          ),
        )
        .limit(1);

      if (!order) {
        throw new NotFoundException('采购订单不存在');
      }

      if (order.status !== 'pending') {
        throw new BadRequestException('订单状态不是待处理，无法确认入库');
      }

      // 2. 更新订单状态为已完成
      const [updated] = await trx
        .update(schema.purchaseOrders)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(schema.purchaseOrders.id, orderId))
        .returning();

      // 注：实际项目中应该根据订单明细更新库存
      // 这里简化处理，仅更新订单状态

      return updated;
    });
  }

  // ========== 销售订单（带事务） ==========
  async findSalesOrdersPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.salesOrders.enterpriseId, eid);
    if (params.status) {
      whereClause = and(
        whereClause,
        eq(schema.salesOrders.status, params.status),
      )!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.salesOrders)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.salesOrders)
      .where(whereClause)
      .orderBy(desc(schema.salesOrders.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.id,
        orderNo: r.orderNo,
        customerId: r.customerId,
        totalAmount: Number(r.totalAmount),
        status: r.status,
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createSalesOrder(
    enterpriseId: number | undefined,
    dto: CreateSalesOrderDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    // 使用事务确保数据一致性
    return await this.db.transaction(async (trx) => {
      // 1. 验证所有商品是否存在、属于当前企业且库存充足
      for (const item of dto.items) {
        const [product] = await trx
          .select()
          .from(schema.products)
          .where(
            and(
              eq(schema.products.id, item.productId),
              eq(schema.products.enterpriseId, eid),
            ),
          )
          .limit(1);

        if (!product) {
          throw new NotFoundException(`商品 ID ${item.productId} 不存在`);
        }

        const currentStock = product.stock ?? 0;
        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `商品 "${product.name}" 库存不足，当前库存: ${currentStock}，需要: ${item.quantity}`,
          );
        }
      }

      // 2. 生成订单号
      const orderNo = `SO${Date.now()}`;
      const totalAmount = dto.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      // 3. 创建销售订单
      const [order] = await trx
        .insert(schema.salesOrders)
        .values({
          enterpriseId: eid,
          orderNo,
          customerId: dto.customerId ?? null,
          totalAmount: String(totalAmount),
          status: 'pending',
          remark: dto.remark ?? null,
        })
        .returning();

      return order;
    });
  }

  // ========== 销售出库（带事务） ==========
  async confirmSalesOrder(enterpriseId: number | undefined, orderId: number) {
    const eid = requireEnterpriseId(enterpriseId);

    return await this.db.transaction(async (trx) => {
      // 1. 查询订单
      const [order] = await trx
        .select()
        .from(schema.salesOrders)
        .where(
          and(
            eq(schema.salesOrders.id, orderId),
            eq(schema.salesOrders.enterpriseId, eid),
          ),
        )
        .limit(1);

      if (!order) {
        throw new NotFoundException('销售订单不存在');
      }

      if (order.status !== 'pending') {
        throw new BadRequestException('订单状态不是待处理，无法确认出库');
      }

      // 2. 更新订单状态为已完成
      const [updated] = await trx
        .update(schema.salesOrders)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(schema.salesOrders.id, orderId))
        .returning();

      // 注：实际项目中应该根据订单明细扣减库存
      // 这里简化处理，仅更新订单状态

      return updated;
    });
  }

  // ========== 库存流水 ==========
  async findInventoryLogs(params: {
    enterpriseId?: number;
    productId?: number;
    page: number;
    pageSize: number;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.inventoryLogs.enterpriseId, eid);
    if (params.productId) {
      whereClause = and(
        whereClause,
        eq(schema.inventoryLogs.productId, params.productId),
      )!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.inventoryLogs)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select({
        log: schema.inventoryLogs,
        product: schema.products,
      })
      .from(schema.inventoryLogs)
      .leftJoin(
        schema.products,
        eq(schema.inventoryLogs.productId, schema.products.id),
      )
      .where(whereClause)
      .orderBy(desc(schema.inventoryLogs.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.log.id,
        productId: r.log.productId,
        productName: r.product?.name ?? '未知商品',
        type: r.log.type,
        quantity: r.log.quantity,
        beforeStock: r.log.beforeStock,
        afterStock: r.log.afterStock,
        orderId: r.log.orderId,
        remark: r.log.remark,
        createdAt: r.log.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  // ========== 库存调整（带事务） ==========
  async adjustStock(
    enterpriseId: number | undefined,
    productId: number,
    quantity: number,
    remark?: string,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    return await this.db.transaction(async (trx) => {
      // 1. 查询商品
      const [product] = await trx
        .select()
        .from(schema.products)
        .where(
          and(
            eq(schema.products.id, productId),
            eq(schema.products.enterpriseId, eid),
          ),
        )
        .limit(1);

      if (!product) {
        throw new NotFoundException('商品不存在');
      }

      const beforeStock = product.stock ?? 0;
      const afterStock = beforeStock + quantity;

      if (afterStock < 0) {
        throw new BadRequestException('库存调整后不能为负数');
      }

      // 2. 更新库存
      await trx
        .update(schema.products)
        .set({
          stock: afterStock,
          updatedAt: new Date(),
        })
        .where(eq(schema.products.id, productId));

      // 3. 记录库存流水
      await trx.insert(schema.inventoryLogs).values({
        enterpriseId: eid,
        productId,
        type: quantity >= 0 ? 'in' : 'out',
        quantity,
        beforeStock,
        afterStock,
        orderId: null,
        remark: remark ?? `库存调整: ${quantity > 0 ? '+' : ''}${quantity}`,
      });

      return {
        productId,
        beforeStock,
        afterStock,
        quantity,
      };
    });
  }
}
