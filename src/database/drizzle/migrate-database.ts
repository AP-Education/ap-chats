import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/** Applies pending migrations; a deploy runs it once, before any API instance starts. */
export async function migrateDatabase(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });

  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
}
