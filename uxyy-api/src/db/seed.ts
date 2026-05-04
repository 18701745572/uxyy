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

  console.log(
    `Seeded dev user phone=${SEED_PHONE} password=${SEED_PASSWORD} enterpriseId=${enterprise.id}`,
  );
  await pool.end();
}

void main();
