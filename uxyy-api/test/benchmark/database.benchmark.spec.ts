import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE_DB } from '../../src/modules/database/database.constants';
import { DatabaseModule } from '../../src/modules/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { eq, and, like, desc } from 'drizzle-orm';
import * as schema from '../../src/db/schema';

/**
 * 数据库性能基准测试
 * 测试数据库查询的性能指标
 */
describe('Database Performance Benchmarks', () => {
  let db: any;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        DatabaseModule,
      ],
    }).compile();

    db = moduleRef.get(DRIZZLE_DB);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  describe('Customer Queries', () => {
    it('should query customers by enterpriseId within 100ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.enterpriseId, 1))
        .limit(10);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should query customers with search within 200ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select()
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.enterpriseId, 1),
            like(schema.customers.name, '%测试%')
          )
        )
        .limit(20);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(200);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should query customers with pagination within 150ms', async () => {
      const startTime = Date.now();
      
      const [data, countResult] = await Promise.all([
        db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.enterpriseId, 1))
          .orderBy(desc(schema.customers.createdAt))
          .limit(20)
          .offset(0),
        db
          .select({ count: db.fn.count() })
          .from(schema.customers)
          .where(eq(schema.customers.enterpriseId, 1)),
      ]);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(150);
      expect(Array.isArray(data)).toBe(true);
      expect(Array.isArray(countResult)).toBe(true);
    });
  });

  describe('Product Queries', () => {
    it('should query products by enterpriseId within 100ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.enterpriseId, 1))
        .limit(20);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should query products with category join within 200ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select({
          product: schema.products,
          category: schema.productCategories,
        })
        .from(schema.products)
        .leftJoin(
          schema.productCategories,
          eq(schema.products.categoryId, schema.productCategories.id)
        )
        .where(eq(schema.products.enterpriseId, 1))
        .limit(20);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(200);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Inventory Queries', () => {
    it('should query inventory with product details within 200ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select({
          inventory: schema.inventory,
          product: schema.products,
          warehouse: schema.warehouses,
        })
        .from(schema.inventory)
        .innerJoin(
          schema.products,
          eq(schema.inventory.productId, schema.products.id)
        )
        .innerJoin(
          schema.warehouses,
          eq(schema.inventory.warehouseId, schema.warehouses.id)
        )
        .where(eq(schema.inventory.enterpriseId, 1))
        .limit(20);
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(200);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Concurrent Queries', () => {
    it('should handle 20 concurrent queries', async () => {
      const queries = Array(20).fill(null).map(() =>
        db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.enterpriseId, 1))
          .limit(10)
      );

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const totalTime = Date.now() - startTime;

      // 20 个并发查询应该在 1 秒内完成
      expect(totalTime).toBeLessThan(1000);
      
      // 所有查询都应该返回数组
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle mixed concurrent queries', async () => {
      const queries = [
        db.select().from(schema.customers).where(eq(schema.customers.enterpriseId, 1)).limit(10),
        db.select().from(schema.products).where(eq(schema.products.enterpriseId, 1)).limit(10),
        db.select().from(schema.inventory).where(eq(schema.inventory.enterpriseId, 1)).limit(10),
        db.select().from(schema.salesOrders).where(eq(schema.salesOrders.enterpriseId, 1)).limit(10),
        db.select().from(schema.purchaseOrders).where(eq(schema.purchaseOrders.enterpriseId, 1)).limit(10),
      ];

      const startTime = Date.now();
      const results = await Promise.all(queries);
      const totalTime = Date.now() - startTime;

      // 5 个不同类型的并发查询应该在 500ms 内完成
      expect(totalTime).toBeLessThan(500);
      
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('Aggregate Queries', () => {
    it('should count records within 100ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select({ count: db.fn.count() })
        .from(schema.customers)
        .where(eq(schema.customers.enterpriseId, 1));
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('count');
    });

    it('should calculate sum within 150ms', async () => {
      const startTime = Date.now();
      
      const result = await db
        .select({ 
          totalAmount: db.fn.sum(schema.salesOrders.totalAmount),
          count: db.fn.count(),
        })
        .from(schema.salesOrders)
        .where(eq(schema.salesOrders.enterpriseId, 1));
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(150);
      expect(result).toBeDefined();
    });
  });

  describe('Insert Performance', () => {
    it('should insert single record within 100ms', async () => {
      const testCustomer = {
        enterpriseId: 1,
        name: `性能测试_${Date.now()}`,
        phone: `138${String(Math.random()).slice(2, 11)}`,
        contactPerson: '测试',
        address: '测试地址',
        type: 'enterprise',
        level: 'regular',
        source: 'manual',
        isDeleted: false,
      };

      const startTime = Date.now();
      
      const result = await db
        .insert(schema.customers)
        .values(testCustomer)
        .returning();
      
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).toBeLessThan(100);
      expect(result).toBeDefined();
      expect(result[0]).toHaveProperty('id');

      // 清理测试数据
      await db
        .delete(schema.customers)
        .where(eq(schema.customers.id, result[0].id));
    });
  });
});
