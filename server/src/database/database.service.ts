import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { configuration } from '../config';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly pool = new Pool({
    connectionString: configuration().databaseUrl,
    max: 10,
  });
  readonly db: NodePgDatabase<typeof schema> = drizzle(this.pool, { schema });
  constructor() {
    this.pool.on('error', () =>
      console.error('A database pool connection failed.'),
    );
  }
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
export type Transaction = Parameters<
  Parameters<DatabaseService['db']['transaction']>[0]
>[0];
