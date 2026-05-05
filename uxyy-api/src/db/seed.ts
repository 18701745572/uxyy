import 'dotenv/config';
import bcrypt from 'bcrypt';
import { count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
const SEED_PHONE = process.env.SEED_DEV_PHONE ?? '13800138000';
const SEED_PASSWORD = process.env.SEED_DEV_PASSWORD ?? 'Dev12345!';
const ROUNDS = 10;

async function seedSampleCustomers(
  db: NodePgDatabase<typeof schema>,
  enterpriseId: number,
) {
  const [row] = await db
    .select({ c: count() })
    .from(schema.customers)
    .where(eq(schema.customers.enterpriseId, enterpriseId));
  const n = Number(row?.c ?? 0);
  if (n > 0) {
    return;
  }

  await db.insert(schema.customers).values([
    {
      enterpriseId,
      name: '示例 · 湖滨便利店',
      phone: '0571-82821111',
      remark: '种子数据 · 货到付款',
    },
    {
      enterpriseId,
      name: '示例 · 城南五金批发',
      phone: '13900001234',
    },
    {
      enterpriseId,
      name: '示例 · XX 塑料制品厂',
      remark: '月结 · 含税专票',
    },
  ]);

  console.log(`Seeded ${3} demo customers for enterpriseId=${enterpriseId}`);
}

async function seedSampleInventory(
  db: NodePgDatabase<typeof schema>,
  enterpriseId: number,
  userId: number,
) {
  const [existingProduct] = await db
    .select({ c: count() })
    .from(schema.products)
    .where(eq(schema.products.enterpriseId, enterpriseId));
  const n = Number(existingProduct?.c ?? 0);
  if (n > 0) {
    return;
  }

  // Categories
  const [cat1] = await db
    .insert(schema.productCategories)
    .values({ enterpriseId, name: '五金工具', sortOrder: 1 })
    .returning();
  const [cat2] = await db
    .insert(schema.productCategories)
    .values({ enterpriseId, name: '电子元器件', sortOrder: 2 })
    .returning();

  // Products
  const [p1] = await db
    .insert(schema.products)
    .values({
      enterpriseId,
      categoryId: cat1.id,
      code: 'P001',
      name: '六角螺栓 M8×30',
      spec: 'M8×30 8.8级',
      unit: '件',
      unitPrice: '12.50',
      costPrice: '8.00',
      minStock: '50',
      maxStock: '500',
    })
    .returning();
  const [p2] = await db
    .insert(schema.products)
    .values({
      enterpriseId,
      categoryId: cat1.id,
      code: 'P002',
      name: '不锈钢平垫 M8',
      spec: 'M8 304不锈钢',
      unit: '件',
      unitPrice: '0.80',
      costPrice: '0.35',
      minStock: '200',
      maxStock: '2000',
    })
    .returning();
  const [p3] = await db
    .insert(schema.products)
    .values({
      enterpriseId,
      categoryId: cat2.id,
      code: 'E001',
      name: '贴片电阻 10KΩ 0805',
      spec: '0805 ±5%',
      unit: '个',
      unitPrice: '0.05',
      costPrice: '0.02',
      minStock: '1000',
      maxStock: '10000',
    })
    .returning();
  const [p4] = await db
    .insert(schema.products)
    .values({
      enterpriseId,
      categoryId: cat2.id,
      code: 'E002',
      name: '电解电容 100μF 25V',
      spec: 'Φ8×12 105℃',
      unit: '个',
      unitPrice: '0.35',
      costPrice: '0.18',
      minStock: '500',
    })
    .returning();
  const [p5] = await db
    .insert(schema.products)
    .values({
      enterpriseId,
      code: 'M001',
      name: '通用清洁剂 500ml',
      spec: '500ml 喷雾装',
      unit: '瓶',
      unitPrice: '15.00',
      costPrice: '9.50',
      minStock: '20',
      maxStock: '100',
    })
    .returning();

  // Suppliers
  await db
    .insert(schema.suppliers)
    .values({
      enterpriseId,
      name: '杭州某某五金批发',
      contactName: '张三',
      phone: '13900001111',
      address: '杭州市余杭区某某路100号',
    })
    .returning();
  await db
    .insert(schema.suppliers)
    .values({
      enterpriseId,
      name: '深圳某某电子商行',
      contactName: '李四',
      phone: '13800002222',
    })
    .returning();

  // Initial inventory stock
  await db.insert(schema.inventory).values([
    { enterpriseId, productId: p1.id, quantity: '200', warehouseId: 1 },
    { enterpriseId, productId: p2.id, quantity: '800', warehouseId: 1 },
    { enterpriseId, productId: p3.id, quantity: '5000', warehouseId: 1 },
    { enterpriseId, productId: p4.id, quantity: '1200', warehouseId: 1 },
    { enterpriseId, productId: p5.id, quantity: '15', warehouseId: 1 },
  ]);

  // Write initial inventory logs (seeding)
  const now = new Date();
  await db.insert(schema.inventoryLogs).values([
    {
      enterpriseId,
      productId: p1.id,
      type: 'in',
      quantity: '200',
      beforeQty: '0',
      afterQty: '200',
      sourceType: 'adjust',
      createdBy: userId,
      createdAt: now,
    },
    {
      enterpriseId,
      productId: p2.id,
      type: 'in',
      quantity: '800',
      beforeQty: '0',
      afterQty: '800',
      sourceType: 'adjust',
      createdBy: userId,
      createdAt: now,
    },
    {
      enterpriseId,
      productId: p3.id,
      type: 'in',
      quantity: '5000',
      beforeQty: '0',
      afterQty: '5000',
      sourceType: 'adjust',
      createdBy: userId,
      createdAt: now,
    },
    {
      enterpriseId,
      productId: p4.id,
      type: 'in',
      quantity: '1200',
      beforeQty: '0',
      afterQty: '1200',
      sourceType: 'adjust',
      createdBy: userId,
      createdAt: now,
    },
    {
      enterpriseId,
      productId: p5.id,
      type: 'in',
      quantity: '15',
      beforeQty: '0',
      afterQty: '15',
      sourceType: 'adjust',
      createdBy: userId,
      createdAt: now,
    },
  ]);

  console.log(
    `Seeded 2 categories, 5 products, 2 suppliers, 5 inventory records for enterpriseId=${enterpriseId}`,
  );
}

async function main() {
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, SEED_PHONE))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    if (!user) {
      await pool.end();
      return;
    }
    console.log(`Seed skipped: user ${SEED_PHONE} already exists.`);
    const [membership] = await db
      .select()
      .from(schema.userEnterprises)
      .where(eq(schema.userEnterprises.userId, user.id))
      .limit(1);
    const enterpriseId = membership?.enterpriseId;
    if (enterpriseId != null) {
      await seedSampleCustomers(db, enterpriseId);
      await seedSampleInventory(db, enterpriseId, user.id);
    }
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, ROUNDS);

  const [user] = await db
    .insert(schema.users)
    .values({
      phone: SEED_PHONE,
      passwordHash,
      nickname: 'Dev Seed',
      status: 'active',
    })
    .returning({ id: schema.users.id });

  if (!user) {
    throw new Error('Failed to insert seed user');
  }

  const [enterprise] = await db
    .insert(schema.enterprises)
    .values({
      ownerId: user.id,
      name: '开发用企业（seed）',
      status: 'active',
    })
    .returning({ id: schema.enterprises.id });

  if (!enterprise) {
    throw new Error('Failed to insert seed enterprise');
  }

  await db.insert(schema.userEnterprises).values({
    userId: user.id,
    enterpriseId: enterprise.id,
    role: 'boss',
    isDefault: true,
  });

  await seedSampleCustomers(db, enterprise.id);
  await seedSampleInventory(db, enterprise.id, user.id);

  console.log(
    `Seeded dev user phone=${SEED_PHONE} password=${SEED_PASSWORD} enterpriseId=${enterprise.id}`,
  );
  await pool.end();
}

void main();
