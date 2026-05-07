import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface SetMemberPriceDto {
  productId: number;
  levelId: number;
  price: string;
  discountRate?: string;
  isEnabled?: boolean;
}

@Injectable()
export class MemberPriceService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 设置商品会员价格
   */
  async setMemberPrice(enterpriseId: number, dto: SetMemberPriceDto) {
    // 验证商品和会员等级是否存在
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.id, dto.productId),
          eq(schema.products.enterpriseId, enterpriseId),
        ),
      );

    if (!product) {
      throw new NotFoundException('商品不存在');
    }

    const [level] = await this.db
      .select()
      .from(schema.memberLevels)
      .where(
        and(
          eq(schema.memberLevels.id, dto.levelId),
          eq(schema.memberLevels.enterpriseId, enterpriseId),
        ),
      );

    if (!level) {
      throw new NotFoundException('会员等级不存在');
    }

    // 检查是否已存在
    const [existing] = await this.db
      .select()
      .from(schema.productMemberPrices)
      .where(
        and(
          eq(schema.productMemberPrices.productId, dto.productId),
          eq(schema.productMemberPrices.levelId, dto.levelId),
          eq(schema.productMemberPrices.enterpriseId, enterpriseId),
        ),
      );

    if (existing) {
      // 更新
      const [updated] = await this.db
        .update(schema.productMemberPrices)
        .set({
          price: dto.price,
          discountRate: dto.discountRate || existing.discountRate,
          isEnabled: dto.isEnabled ?? existing.isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(schema.productMemberPrices.id, existing.id))
        .returning();
      return updated;
    } else {
      // 创建
      const [created] = await this.db
        .insert(schema.productMemberPrices)
        .values({
          enterpriseId,
          ...dto,
        })
        .returning();
      return created;
    }
  }

  /**
   * 获取商品的会员价格列表
   */
  async getProductMemberPrices(productId: number, enterpriseId: number) {
    const prices = await this.db
      .select({
        price: schema.productMemberPrices,
        level: schema.memberLevels,
      })
      .from(schema.productMemberPrices)
      .leftJoin(
        schema.memberLevels,
        eq(schema.productMemberPrices.levelId, schema.memberLevels.id),
      )
      .where(
        and(
          eq(schema.productMemberPrices.productId, productId),
          eq(schema.productMemberPrices.enterpriseId, enterpriseId),
          eq(schema.productMemberPrices.isEnabled, true),
        ),
      );

    return prices;
  }

  /**
   * 获取会员等级的商品价格列表
   */
  async getLevelProductPrices(levelId: number, enterpriseId: number) {
    const prices = await this.db
      .select({
        price: schema.productMemberPrices,
        product: schema.products,
      })
      .from(schema.productMemberPrices)
      .leftJoin(
        schema.products,
        eq(schema.productMemberPrices.productId, schema.products.id),
      )
      .where(
        and(
          eq(schema.productMemberPrices.levelId, levelId),
          eq(schema.productMemberPrices.enterpriseId, enterpriseId),
          eq(schema.productMemberPrices.isEnabled, true),
        ),
      );

    return prices;
  }

  /**
   * 获取客户专属价格
   */
  async getCustomerPrice(
    customerId: number,
    productId: number,
    enterpriseId: number,
  ): Promise<{ price: string; discountRate: string; source: string } | null> {
    // 获取客户会员信息
    const [member] = await this.db
      .select()
      .from(schema.customerMembers)
      .where(
        and(
          eq(schema.customerMembers.customerId, customerId),
          eq(schema.customerMembers.enterpriseId, enterpriseId),
        ),
      );

    if (!member || !member.levelId) {
      return null;
    }

    // 获取会员专属价格
    const [memberPrice] = await this.db
      .select()
      .from(schema.productMemberPrices)
      .where(
        and(
          eq(schema.productMemberPrices.productId, productId),
          eq(schema.productMemberPrices.levelId, member.levelId),
          eq(schema.productMemberPrices.enterpriseId, enterpriseId),
          eq(schema.productMemberPrices.isEnabled, true),
        ),
      );

    if (memberPrice) {
      return {
        price: memberPrice.price,
        discountRate: memberPrice.discountRate || '100',
        source: 'member_price',
      };
    }

    // 如果没有专属价格，使用等级默认折扣
    const [level] = await this.db
      .select()
      .from(schema.memberLevels)
      .where(eq(schema.memberLevels.id, member.levelId));

    if (level && level.discountRate && level.discountRate !== '100') {
      const [product] = await this.db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId));

      if (product) {
        const originalPrice = parseFloat(product.unitPrice);
        const discountRate = parseFloat(level.discountRate);
        const discountedPrice = (originalPrice * discountRate / 100).toFixed(2);

        return {
          price: discountedPrice,
          discountRate: level.discountRate,
          source: 'level_discount',
        };
      }
    }

    return null;
  }

  /**
   * 批量设置会员价格
   */
  async batchSetMemberPrices(
    enterpriseId: number,
    productId: number,
    prices: Array<{ levelId: number; price: string; discountRate?: string }>,
  ) {
    const results = [];

    for (const price of prices) {
      const result = await this.setMemberPrice(enterpriseId, {
        productId,
        ...price,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * 删除会员价格
   */
  async deleteMemberPrice(id: number, enterpriseId: number) {
    const [deleted] = await this.db
      .delete(schema.productMemberPrices)
      .where(
        and(
          eq(schema.productMemberPrices.id, id),
          eq(schema.productMemberPrices.enterpriseId, enterpriseId),
        ),
      )
      .returning();

    return deleted;
  }
}
