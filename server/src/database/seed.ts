import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users } from './schema';
import { hashPassword } from '../auth/password';

export async function seed(
  pool: Pool,
  email: string,
  password: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    password.length < 16 ||
    password.length > 256
  )
    throw new Error('Seed email or password is invalid');
  const db = drizzle(pool);
  if (
    (
      await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalized))
    ).length
  )
    return;
  await db
    .insert(users)
    .values({
      id: randomUUID(),
      email: normalized,
      passwordHash: await hashPassword(password),
    })
    .onConflictDoNothing({ target: users.email });
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  void seed(
    pool,
    process.env.SEED_EMAIL ?? 'photometrix@cpu.edu.ph',
    process.env.SEED_PASSWORD ?? '',
  )
    .then(() =>
      console.log('Private account provisioned (existing password preserved).'),
    )
    .catch(() => {
      console.error(
        'Account seed failed; verify database and seed configuration.',
      );
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
