import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/** Any Drizzle Postgres database: postgres-js in production, PGlite in tests. */
export type Database = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

export function createDatabase(url: string): { db: Database; close: () => Promise<void> } {
  // Supabase's transaction pooler does not support prepared statements.
  const client = postgres(url, { prepare: false, max: 5 });
  return { db: drizzle(client) as unknown as Database, close: () => client.end() };
}
