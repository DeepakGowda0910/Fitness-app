import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { schema } from '../src/index.js';

/**
 * Minimal stand-in for what Supabase provides before our migrations run:
 * the auth schema with auth.uid(), and the anon/authenticated roles.
 * Supabase's real auth.uid() also reads the `sub` claim of request.jwt.claims.
 */
const SUPABASE_SHIM = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $$;
`;

/** Supabase's default privileges grant table access to these roles; RLS then filters rows. */
const SUPABASE_GRANTS = `
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`;

export async function freshDb() {
  const client = new PGlite();
  await client.exec(SUPABASE_SHIM);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: new URL('../migrations', import.meta.url).pathname });
  await client.exec(SUPABASE_GRANTS);
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
