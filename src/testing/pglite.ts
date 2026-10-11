import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

import type { PGlite } from '@electric-sql/pglite';
import { type TransactionalAdapter, TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';
import type { PgliteDatabase } from 'drizzle-orm/pglite';

import type * as schema from '@/database/drizzle/schema';

export type TestDatabase = PgliteDatabase<typeof schema>;

/** Applies the real migrations; `seed` runs right before the `before` migration. */
export async function migrate(pg: PGlite, options?: { before: string; seed: string }) {
  const migrations = readdirSync('drizzle')
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .sort();
  const seedAt = options ? migrations.indexOf(options.before) : -1;
  if (options) assert.ok(seedAt >= 0, `missing migration ${options.before}`);

  for (const [index, migration] of migrations.entries()) {
    if (index === seedAt) await pg.query(options!.seed);
    await pg.exec(readFileSync(`drizzle/${migration}`, 'utf8'));
  }
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
