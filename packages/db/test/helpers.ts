import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { migrationsFolder, schema, SUPABASE_TEST_GRANTS_SQL, SUPABASE_TEST_SHIM_SQL } from '../src/index.js';

export async function freshDb() {
  const client = new PGlite();
  await client.exec(SUPABASE_TEST_SHIM_SQL);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  await client.exec(SUPABASE_TEST_GRANTS_SQL);
  return db;
}

export type Db = Awaited<ReturnType<typeof freshDb>>;

/** Postgres error code, whether thrown directly or wrapped by Drizzle. */
export async function pgErrorCode(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    return err.cause?.code ?? err.code;
  }
  return undefined;
}
