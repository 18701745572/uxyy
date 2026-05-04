import 'dotenv/config';
import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;
const SEED_PHONE = process.env.SEED_DEV_PHONE ?? '13800138000';
const SEED_PASSWORD = process.env.SEED_DEV_PASSWORD ?? 'Dev12345!';
const ROUNDS = 10;

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
    console.log(`Seed skipped: user ${SEED_PHONE} already exists.`);
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

  console.log(
    `Seeded dev user phone=${SEED_PHONE} password=${SEED_PASSWORD} enterpriseId=${enterprise.id}`,
  );
  await pool.end();
}

void main();
