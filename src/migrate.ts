import { migrateDatabase } from './database/drizzle/migrate-database';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to migrate');

migrateDatabase(databaseUrl).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
