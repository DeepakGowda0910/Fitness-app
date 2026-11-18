import { sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';

/**
 * Runs `fn` in a transaction as the Supabase `authenticated` role with the
 * caller's user id as JWT `sub`, so row-level security applies to every query.
 * The API must use this for all user-facing reads and writes.
 */
export async function withUser<DB extends PgDatabase<PgQueryResultHKT, Record<string, unknown>>, T>(
  db: DB,
  authUserId: string,
  fn: (tx: Parameters<Parameters<DB['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: authUserId, role: 'authenticated' });
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return fn(tx as never);
  }) as Promise<T>;
}
