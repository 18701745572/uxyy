import 'dotenv/config';
import bcrypt from 'bcrypt';
import { count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { UxyyRole, type UxyyRoleCode } from '../modules/auth/role-permissions';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
const SEED_PHONE = process.env.SEED_DEV_PHONE ?? '13800138000';
const SEED_PASSWORD = process.env.SEED_DEV_PASSWORD ?? 'Dev12345!';
const ROUNDS = 10;

const PURGE_FIVE_CLI = process.argv.includes('--purge-five-roles');

function envTruthy(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** 破坏性：清空 public 应用表；跳过以 __ 开头的表（如 Drizzle 迁移元数据）。 */
async function truncatePublicApplicationTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
      ['public'],
    );
    const names = res.rows.map((r) => r.tablename).filter((t) => !t.startsWith('__'));
    if (names.length === 0) {
      await client.query('COMMIT');
      return;
    }
    const quoted = names
      .map((t) => `"${String(t).replace(/"/g, '""')}"`)
      .join(', ');
    await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

type FiveRoleSeedRow = {
  phone: string;
  nickname: string;
  role: UxyyRoleCode;
  isBoss: boolean;
};

function fiveRoleSeedRows(): ReadonlyArray<FiveRoleSeedRow> {
  return [
    {
      phone: SEED_PHONE,
      nickname: '种子用户·老板',
      role: UxyyRole.BOSS,
      isBoss: true,
    },
    {
      phone:
        process.env.SEED_DEMO_FINANCE_PHONE ??
        process.env.SEED_PURGE_SECONDARY_FINANCE ??
        '13900138901',
      nickname: '种子用户·财务',
      role: UxyyRole.FINANCE,
      isBoss: false,
    },
    {
      phone:
        process.env.SEED_DEMO_SALES_PHONE ??
        process.env.SEED_PURGE_SECONDARY_SALES ??
        '13900138902',
      nickname: '种子用户·销售',
      role: UxyyRole.SALES,
      isBoss: false,
    },
    {
      phone:
        process.env.SEED_DEMO_WAREHOUSE_PHONE ??
        process.env.SEED_PURGE_SECONDARY_WAREHOUSE ??
        '13900138903',
      nickname: '种子用户·仓管',
      role: UxyyRole.WAREHOUSE,
      isBoss: false,
    },
    {
      phone:
        process.env.SEED_DEMO_OA_PHONE ??
        process.env.SEED_PURGE_SECONDARY_OA ??
        '13900138904',
      nickname: '种子用户·行政',
      role: UxyyRole.OA,
      isBoss: false,
    },
  ];
}

async function purgeAndSeedFiveRoleMatrix(
  pool: Pool,
  db: NodePgDatabase<typeof schema>,
): Promise<void> {
  console.warn(
    '[seed] DESTRUCTIVE：将 TRUNCATE public 下全部应用表（保留 Drizzle 迁移表），随后写入五种角色演示成员。',
  );
  await truncatePublicApplicationTables(pool);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, ROUNDS);
  const rows = fiveRoleSeedRows();
  const phones = rows.map((r) => r.phone.trim());
  if (new Set(phones).size !== phones.length) {
    throw new Error('[seed] 五角色矩阵手机号存在重复');
  }

  const createdUsers = await db
    .insert(schema.users)
    .values(
      rows.map((cfg) => ({
        phone: cfg.phone.trim(),
        passwordHash,
        nickname: cfg.nickname,
        status: 'active' as const,
      })),
    )
    .returning({
      id: schema.users.id,
      phone: schema.users.phone,
    });

  if (createdUsers.length !== rows.length) {
    throw new Error('[seed] 创建用户数与配置不一致');
  }

  const bossCfg = rows.find((r) => r.isBoss);
  if (!bossCfg) throw new Error('[seed] missing boss row');
  const bossUser = createdUsers.find((u) => u.phone.trim() === bossCfg.phone.trim());
  if (!bossUser) throw new Error('[seed] boss user missing');

  const [enterprise] = await db
    .insert(schema.enterprises)
    .values({
      ownerId: bossUser.id,
      name:
        process.env.SEED_PURGE_ENTERPRISE_NAME ??
        process.env.SEED_ENTERPRISE_NAME ??
        '演示企业（五种角色矩阵）',
      status: 'active',
      maxUsers: 99,
    })
    .returning({ id: schema.enterprises.id });

  if (!enterprise) throw new Error('[seed] 创建企业失败');

  await db.insert(schema.userEnterprises).values(
    createdUsers.map((u) => {
      const cfg = rows.find((r) => r.phone.trim() === u.phone.trim());
      if (!cfg) throw new Error(`[seed] 无角色配置: ${u.phone}`);
      return {
        userId: u.id,
        enterpriseId: enterprise.id,
        role: cfg.role,
        isDefault: true,
      };
    }),
  );

  console.log(
    `\n[seed] 已完成。enterpriseId=${enterprise.id}，统一密码="${SEED_PASSWORD}"：`,
  );
  for (const u of createdUsers) {
    const cfg = rows.find((r) => r.phone.trim() === u.phone.trim());
    console.log(`  • ${cfg?.role}\t手机号 ${u.phone}\tuserId=${u.id}`);
  }

  await seedSampleCustomers(db, enterprise.id, bossUser.id);
  await seedSampleInventory(db, enterprise.id, bossUser.id);
  await ensureSeedEmployeeProfile(db, enterprise.id, bossUser.id);
  console.log(
    `[seed] 演示客户、库存、员工档案已挂到老板账号 userId=${bossUser.id}。\n`,
  );
}

/** 保证该企业至少有一条仓库主数据，供 GET /inventory/warehouses、盘点等到处使用 */
async function ensureEnterpriseDefaultWarehouse(
  db: NodePgDatabase<typeof schema>,
  enterpriseId: number,
  userId: number,
): Promise<number> {
  const [existing] = await db
    .select({ id: schema.warehouses.id })
    .from(schema.warehouses)
    .where(eq(schema.warehouses.enterpriseId, enterpriseId))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(schema.warehouses)
    .values({
      enterpriseId,
      name: '主仓库',
      code: 'WH-MAIN',
      isDefault: true,
      status: 'active',
      createdBy: userId,
    })
    .returning({ id: schema.warehouses.id });

  if (!created) throw new Error('Failed to seed default warehouse');
  console.log(
    `Seeded default warehouse id=${created.id} for enterpriseId=${enterpriseId}`,
  );
  return created.id;
}

async function seedSampleCustomers(
  db: NodePgDatabase<typeof schema>,
  enterpriseId: number,
  userId: number,
) {
  const [row] = await db
    .select({ c: count() })
    .from(schema.customers)
    .where(eq(schema.customers.enterpriseId, enterpriseId));
  const n = Number(row?.c ?? 0);
  if (n > 0) {
    return;
  }

  const customers = await db
    .insert(schema.customers)
    .values([
      {
        enterpriseId,
        name: '示例 · 湖滨便利店',
        phone: '0571-82821111',
        contactPerson: '王店主',
        address: '杭州市西湖区湖滨路100号',
        type: 'enterprise',
        level: 'VIP',
        industry: '零售',
        tags: ['重点客户', '货到付款'],
        source: 'manual',
        assignedTo: userId,
        creditLimit: '50000',
        remark: '种子数据 · 货到付款',
      },
      {
        enterpriseId,
        name: '示例 · 城南五金批发',
        phone: '13900001234',
        contactPerson: '李经理',
        address: '杭州市萧山区建设三路88号',
        type: 'enterprise',
        level: 'regular',
        industry: '五金',
        tags: ['批发'],
        source: 'import',
        assignedTo: userId,
        creditLimit: '20000',
      },
      {
        enterpriseId,
        name: '示例 · XX 塑料制品厂',
        contactPerson: '陈采购',
        type: 'enterprise',
        level: 'potential',
        industry: '制造业',
        tags: ['月结', '含税专票'],
        source: 'wechat',
        remark: '月结 · 含税专票',
        creditLimit: '100000',
      },
    ])
    .returning();

  console.log(
    `Seeded ${customers.length} demo customers for enterpriseId=${enterpriseId}`,
  );

  if (customers.length > 0) {
    const [firstCustomer] = customers;
    if (firstCustomer) {
      await db.insert(schema.followUpRecords).values([
        {
          customerId: firstCustomer.id,
          enterpriseId,
          content: '初次电话沟通，客户对进货渠道比较关注，约定下周三面谈。',
          type: 'text',
          nextFollowUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdBy: userId,
        },
        {
          customerId: firstCustomer.id,
          enterpriseId,
          content: '面谈顺利，客户同意试用一批货，已发送报价单。',
          type: 'text',
          createdBy: userId,
        },
      ]);
      console.log(
        `Seeded 2 follow-up records for customer id=${firstCustomer.id}`,
      );
    }
  }
}

async function seedSampleInventory(
  db: NodePgDatabase<typeof schema>,
  enterpriseId: number,
  userId: number,
) {
  const defaultWarehouseId = await ensureEnterpriseDefaultWarehouse(
    db,
    enterpriseId,
    userId,
  );

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

  // Initial inventory stock（与仓库主档 id 对齐）
  await db.insert(schema.inventory).values([
    {
      enterpriseId,
      productId: p1.id,
      quantity: '200',
      warehouseId: defaultWarehouseId,
    },
    {
      enterpriseId,
      productId: p2.id,
      quantity: '800',
      warehouseId: defaultWarehouseId,
    },
    {
      enterpriseId,
      productId: p3.id,
      quantity: '5000',
      warehouseId: defaultWarehouseId,
    },
    {
      enterpriseId,
      productId: p4.id,
      quantity: '1200',
      warehouseId: defaultWarehouseId,
    },
    {
      enterpriseId,
      productId: p5.id,
      quantity: '15',
      warehouseId: defaultWarehouseId,
    },
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

async function ensureSeedEmployeeProfile(
  db: NodePgDatabase<typeof schema>,
  enterpriseId: number,
  userId: number,
) {
  const [existing] = await db
    .select({ id: schema.employeeProfiles.id })
    .from(schema.employeeProfiles)
    .where(eq(schema.employeeProfiles.userId, userId))
    .limit(1);

  if (existing) return;

  await db.insert(schema.employeeProfiles).values({
    userId,
    enterpriseId,
    department: '运营部',
    position: '店长',
    employeeNo: 'EMP-001',
    phone: SEED_PHONE,
    joinDate: new Date().toISOString().slice(0, 10),
  });

  console.log(
    `Seeded employee_profile for seed user userId=${userId} enterpriseId=${enterpriseId}`,
  );
}

async function main() {
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  if (PURGE_FIVE_CLI || envTruthy('SEED_PURGE_DATABASE')) {
    await purgeAndSeedFiveRoleMatrix(pool, db);
    await pool.end();
    return;
  }

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
      await ensureSeedEmployeeProfile(db, enterpriseId, user.id);
      await seedSampleCustomers(db, enterpriseId, user.id);
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
    role: UxyyRole.BOSS,
    isDefault: true,
  });

  await seedSampleCustomers(db, enterprise.id, user.id);
  await seedSampleInventory(db, enterprise.id, user.id);
  await ensureSeedEmployeeProfile(db, enterprise.id, user.id);

  console.log(
    `Seeded dev user phone=${SEED_PHONE} password=${SEED_PASSWORD} enterpriseId=${enterprise.id}`,
  );
  await pool.end();
}

void main();
