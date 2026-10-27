import 'dotenv/config';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export async function migrateDatabase(pool: Pool): Promise<void> {
  await migrate(drizzle(pool), {
    migrationsFolder: resolve(__dirname, '../../drizzle'),
  });
}
if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  void migrateDatabase(pool)
    .then(() => console.log('Database migrations applied.'))
    .catch(() => {
      console.error(
        'Database migration failed; verify connection and migration files.',
      );
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
