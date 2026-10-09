import { readdirSync, readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';

import * as schema from '@/database/drizzle/schema';

export type TestDatabase = PgliteDatabase<typeof schema>;

export function migrationFiles(): string[] {
  return readdirSync('drizzle')
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .sort();
}

/** Embedded PostgreSQL with every real migration applied; no application database is contacted. */
export async function migratedDatabase() {
  const pg = await PGlite.create();
  for (const migration of migrationFiles())
    await pg.exec(readFileSync(`drizzle/${migration}`, 'utf8'));

  return { pg, db: drizzle(pg, { schema }) };
}

export function transactionHost(db: TestDatabase) {
  const adapter = new TransactionalAdapterDrizzleOrm<TestDatabase>({
    drizzleInstanceToken: Symbol('test-db'),
  });

  return new TransactionHost<TransactionalAdapter<TestDatabase, TestDatabase, object>>({
    ...adapter.optionsFactory(db),
    connectionName: undefined,
    enableTransactionProxy: false,
    defaultTxOptions: { isolationLevel: 'read committed' },
    extraProviderTokens: [],
  });
}
