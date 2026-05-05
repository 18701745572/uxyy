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
      await seedSampleCustomers(db, enterpriseId, user.id);
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

  await seedSampleCustomers(db, enterprise.id, user.id);

  console.log(
    `Seeded dev user phone=${SEED_PHONE} password=${SEED_PASSWORD} enterpriseId=${enterprise.id}`,
  );
  await pool.end();
}

void main();
