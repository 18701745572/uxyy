import { Inject, Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface CreateWarehouseDto {
  name: string;
  code?: string;
  address?: string;
  managerId?: number;
  phone?: string;
  isDefault?: boolean;
  remark?: string;
}

export interface UpdateWarehouseDto {
  name?: string;
  code?: string;
  address?: string;
  managerId?: number;
  phone?: string;
  isDefault?: boolean;
  remark?: string;
  status?: string;
}

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(Number(enterpriseId))) {
    throw new ForbiddenException('当前会话未绑定企业，无法操作仓库');
  }
  return enterpriseId;
}

@Injectable()
export class WarehouseService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 创建仓库
   */
  async create(enterpriseId: number | undefined, dto: CreateWarehouseDto, userId: number) {
    const eid = requireEnterpriseId(enterpriseId);
    // 检查是否已存在同名仓库
    const [existing] = await this.db
      .select()
      .from(schema.warehouses)
      .where(
        and(
          eq(schema.warehouses.enterpriseId, eid),
          eq(schema.warehouses.name, dto.name),
        ),
      );

    if (existing) {
      throw new ConflictException('仓库名称已存在');
    }

    // 如果设置为默认仓库，取消其他默认仓库
    if (dto.isDefault) {
      await this.db
        .update(schema.warehouses)
        .set({ isDefault: false })
        .where(
          and(
            eq(schema.warehouses.enterpriseId, eid),
            eq(schema.warehouses.isDefault, true),
          ),
        );
    }

    const [warehouse] = await this.db
      .insert(schema.warehouses)
      .values({
        enterpriseId: eid,
        ...dto,
        createdBy: userId,
      })
      .returning();

    return warehouse;
  }

  /**
   * 获取仓库列表
   */
  async findAll(enterpriseId: number | undefined, status?: string) {
    const eid = requireEnterpriseId(enterpriseId);
    const conditions = [eq(schema.warehouses.enterpriseId, eid)];

    if (status) {
      conditions.push(eq(schema.warehouses.status, status));
    }

    const warehouses = await this.db
      .select({
        warehouse: schema.warehouses,
        manager: schema.users,
      })
      .from(schema.warehouses)
      .leftJoin(
        schema.users,
        eq(schema.warehouses.managerId, schema.users.id),
      )
      .where(and(...conditions))
      .orderBy(schema.warehouses.createdAt);

    // 获取每个仓库的库存统计
    const result = [];
    for (const { warehouse, manager } of warehouses) {
      const [stats] = await this.db
        .select({
          productCount: sql<number>`COUNT(DISTINCT ${schema.inventory.productId})`,
          totalQuantity: sql<string>`COALESCE(SUM(${schema.inventory.quantity}), '0')`,
        })
        .from(schema.inventory)
        .where(
          and(
            eq(schema.inventory.enterpriseId, eid),
            eq(schema.inventory.warehouseId, warehouse.id),
          ),
        );

      result.push({
        ...warehouse,
        managerName: manager?.nickname || manager?.phone,
        productCount: stats?.productCount || 0,
        totalQuantity: stats?.totalQuantity || '0',
      });
    }

    return result;
  }

  /**
   * 获取仓库详情
   */
  async findOne(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [warehouse] = await this.db
      .select({
        warehouse: schema.warehouses,
        manager: schema.users,
      })
      .from(schema.warehouses)
      .leftJoin(
        schema.users,
        eq(schema.warehouses.managerId, schema.users.id),
      )
      .where(
        and(
          eq(schema.warehouses.id, id),
          eq(schema.warehouses.enterpriseId, eid),
        ),
      );

    if (!warehouse) {
      throw new NotFoundException('仓库不存在');
    }

    // 获取库存统计
    const [stats] = await this.db
      .select({
        productCount: sql<number>`COUNT(DISTINCT ${schema.inventory.productId})`,
        totalQuantity: sql<string>`COALESCE(SUM(${schema.inventory.quantity}), '0')`,
      })
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.enterpriseId, eid),
          eq(schema.inventory.warehouseId, id),
        ),
      );

    // 获取库存明细
    const inventory = await this.db
      .select({
        inventory: schema.inventory,
        product: schema.products,
      })
      .from(schema.inventory)
      .leftJoin(
        schema.products,
        eq(schema.inventory.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.inventory.enterpriseId, eid),
          eq(schema.inventory.warehouseId, id),
        ),
      );

    return {
      ...warehouse.warehouse,
      managerName: warehouse.manager?.nickname || warehouse.manager?.phone,
      productCount: stats?.productCount || 0,
      totalQuantity: stats?.totalQuantity || '0',
      inventory: inventory.map(({ inventory, product }) => ({
        ...inventory,
        productName: product?.name,
        productCode: product?.code,
      })),
    };
  }

  /**
   * 更新仓库
   */
  async update(id: number, enterpriseId: number | undefined, dto: UpdateWarehouseDto) {
    const eid = requireEnterpriseId(enterpriseId);
    const [existing] = await this.db
      .select()
      .from(schema.warehouses)
      .where(
        and(
          eq(schema.warehouses.id, id),
          eq(schema.warehouses.enterpriseId, eid),
        ),
      );

    if (!existing) {
      throw new NotFoundException('仓库不存在');
    }

    // 如果设置为默认仓库，取消其他默认仓库
    if (dto.isDefault) {
      await this.db
        .update(schema.warehouses)
        .set({ isDefault: false })
        .where(
          and(
            eq(schema.warehouses.enterpriseId, eid),
            eq(schema.warehouses.isDefault, true),
            sql`${schema.warehouses.id} != ${id}`,
          ),
        );
    }

    const [updated] = await this.db
      .update(schema.warehouses)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.warehouses.id, id),
          eq(schema.warehouses.enterpriseId, eid),
        ),
      )
      .returning();

    return updated;
  }

  /**
   * 删除仓库
   */
  async remove(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    // 检查是否有库存
    const [inventory] = await this.db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.warehouseId, id),
          eq(schema.inventory.enterpriseId, eid),
          sql`${schema.inventory.quantity} > 0`,
        ),
      )
      .limit(1);

    if (inventory) {
      throw new ConflictException('仓库仍有库存，无法删除');
    }

    const [deleted] = await this.db
      .delete(schema.warehouses)
      .where(
        and(
          eq(schema.warehouses.id, id),
          eq(schema.warehouses.enterpriseId, eid),
        ),
      )
      .returning();

    return deleted;
  }

  /**
   * 获取默认仓库
   */
  async getDefaultWarehouse(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [warehouse] = await this.db
      .select()
      .from(schema.warehouses)
      .where(
        and(
          eq(schema.warehouses.enterpriseId, eid),
          eq(schema.warehouses.isDefault, true),
          eq(schema.warehouses.status, 'active'),
        ),
      );

    return warehouse;
  }

  /**
   * 获取仓库库存汇总
   */
  async getWarehouseInventorySummary(
    enterpriseId: number | undefined,
    warehouseId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const summary = await this.db
      .select({
        productId: schema.inventory.productId,
        productName: schema.products.name,
        productCode: schema.products.code,
        quantity: schema.inventory.quantity,
        minStock: schema.products.minStock,
        maxStock: schema.products.maxStock,
      })
      .from(schema.inventory)
      .leftJoin(
        schema.products,
        eq(schema.inventory.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.inventory.enterpriseId, eid),
          eq(schema.inventory.warehouseId, warehouseId),
        ),
      );

    // 标记库存状态
    return summary.map(item => {
      const qty = parseFloat(item.quantity);
      const minStock = parseFloat(item.minStock || '0');
      const maxStock = parseFloat(item.maxStock || '0');

      let stockStatus = 'normal';
      if (minStock > 0 && qty < minStock) {
        stockStatus = 'low';
      } else if (maxStock > 0 && qty > maxStock) {
        stockStatus = 'high';
      }

      return {
        ...item,
        stockStatus,
      };
    });
  }
}
