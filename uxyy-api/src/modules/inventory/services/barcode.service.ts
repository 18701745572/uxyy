import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface BarcodeScanResult {
  type: 'product' | 'batch' | 'order' | 'unknown';
  data: any;
  message?: string;
}

@Injectable()
export class BarcodeService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 扫码识别
   * 支持：商品条码、批次码、订单号
   */
  async scan(barcode: string, enterpriseId: number): Promise<BarcodeScanResult> {
    // 1. 尝试识别为商品条码
    const product = await this.findProductByBarcode(barcode, enterpriseId);
    if (product) {
      return {
        type: 'product',
        data: product,
        message: '商品识别成功',
      };
    }

    // 2. 尝试识别为批次号
    const batch = await this.findBatchByNo(barcode, enterpriseId);
    if (batch) {
      return {
        type: 'batch',
        data: batch,
        message: '批次识别成功',
      };
    }

    // 3. 尝试识别为订单号
    const order = await this.findOrderByNo(barcode, enterpriseId);
    if (order) {
      return {
        type: 'order',
        data: order,
        message: '订单识别成功',
      };
    }

    return {
      type: 'unknown',
      data: null,
      message: '无法识别该条码',
    };
  }

  /**
   * 根据条码查找商品
   */
  async findProductByBarcode(barcode: string, enterpriseId: number) {
    // 优先匹配 code 字段
    const [product] = await this.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.code, barcode),
          eq(schema.products.enterpriseId, enterpriseId),
        ),
      );

    if (product) return product;

    // 尝试从 retail_ext 中匹配条码
    const products = await this.db
      .select()
      .from(schema.products)
      .where(eq(schema.products.enterpriseId, enterpriseId));

    return products.find(p => {
      const ext = p.retailExt as any;
      return ext?.barcode === barcode;
    });
  }

  /**
   * 根据批次号查找批次
   */
  async findBatchByNo(batchNo: string, enterpriseId: number) {
    const [batch] = await this.db
      .select({
        batch: schema.productBatches,
        product: schema.products,
      })
      .from(schema.productBatches)
      .leftJoin(schema.products, eq(schema.productBatches.productId, schema.products.id))
      .where(
        and(
          eq(schema.productBatches.batchNo, batchNo),
          eq(schema.productBatches.enterpriseId, enterpriseId),
        ),
      );

    return batch;
  }

  /**
   * 根据订单号查找订单
   */
  async findOrderByNo(orderNo: string, enterpriseId: number) {
    // 尝试销售订单
    const [salesOrder] = await this.db
      .select({
        order: schema.salesOrders,
        customer: schema.customers,
      })
      .from(schema.salesOrders)
      .leftJoin(schema.customers, eq(schema.salesOrders.customerId, schema.customers.id))
      .where(
        and(
          eq(schema.salesOrders.orderNo, orderNo),
          eq(schema.salesOrders.enterpriseId, enterpriseId),
        ),
      );

    if (salesOrder) {
      return { ...salesOrder, orderType: 'sales' };
    }

    // 尝试采购订单
    const [purchaseOrder] = await this.db
      .select({
        order: schema.purchaseOrders,
        supplier: schema.suppliers,
      })
      .from(schema.purchaseOrders)
      .leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplierId, schema.suppliers.id))
      .where(
        and(
          eq(schema.purchaseOrders.orderNo, orderNo),
          eq(schema.purchaseOrders.enterpriseId, enterpriseId),
        ),
      );

    if (purchaseOrder) {
      return { ...purchaseOrder, orderType: 'purchase' };
    }

    return null;
  }

  /**
   * 扫码入库（采购入库）
   */
  async scanInbound(
    barcode: string,
    enterpriseId: number,
    quantity: string,
    userId: number,
    options?: {
      batchNo?: string;
      expiryDate?: Date;
      productionDate?: Date;
    },
  ) {
    const scanResult = await this.scan(barcode, enterpriseId);

    if (scanResult.type !== 'product') {
      return {
        success: false,
        message: '请扫描商品条码',
        scanResult,
      };
    }

    const product = scanResult.data;

    // 创建或更新批次
    const batchNo = options?.batchNo || this.generateBatchNo();

    // 这里应该调用 batchService 创建批次
    return {
      success: true,
      message: '入库扫描成功',
      product,
      batchNo,
      quantity,
    };
  }

  /**
   * 扫码出库（销售出库）
   */
  async scanOutbound(
    barcode: string,
    enterpriseId: number,
    quantity: string,
    userId: number,
  ) {
    const scanResult = await this.scan(barcode, enterpriseId);

    if (scanResult.type === 'product') {
      const product = scanResult.data;
      // 返回商品库存信息，由前端选择批次
      const inventory = await this.db
        .select()
        .from(schema.inventory)
        .where(
          and(
            eq(schema.inventory.productId, product.id),
            eq(schema.inventory.enterpriseId, enterpriseId),
          ),
        );

      return {
        success: true,
        type: 'product',
        product,
        inventory: inventory[0],
        message: '商品扫描成功，请选择出库批次',
      };
    }

    if (scanResult.type === 'batch') {
      const { batch, product } = scanResult.data;
      return {
        success: true,
        type: 'batch',
        batch,
        product,
        message: '批次扫描成功',
      };
    }

    return {
      success: false,
      message: '无法识别条码',
      scanResult,
    };
  }

  /**
   * 扫码盘点
   */
  async scanStocktaking(
    barcode: string,
    enterpriseId: number,
    actualQty: string,
  ) {
    const scanResult = await this.scan(barcode, enterpriseId);

    if (scanResult.type !== 'product') {
      return {
        success: false,
        message: '请扫描商品条码',
        scanResult,
      };
    }

    const product = scanResult.data;

    // 获取账面库存
    const [inventory] = await this.db
      .select()
      .from(schema.inventory)
      .where(
        and(
          eq(schema.inventory.productId, product.id),
          eq(schema.inventory.enterpriseId, enterpriseId),
        ),
      );

    const bookQty = inventory?.quantity || '0';
    const diffQty = (parseFloat(actualQty) - parseFloat(bookQty)).toFixed(2);

    return {
      success: true,
      product,
      bookQty,
      actualQty,
      diffQty,
      message: diffQty === '0.00' ? '盘点正常' : '库存有差异',
    };
  }

  /**
   * 生成批次号
   */
  private generateBatchNo(): string {
    const date = new Date();
    const prefix = 'B';
    const timestamp = date.getFullYear().toString().slice(2) +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}
