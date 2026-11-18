import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { describe, expect, it } from 'vitest';
import { migrationsFolder, SUPABASE_TEST_SHIM_SQL } from '../src/index.js';

const setupSql = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8');

describe('supabase/setup.sql', () => {
  it('creates the schema, and Drizzle then sees nothing left to apply', async () => {
    const client = new PGlite();
    await client.exec(SUPABASE_TEST_SHIM_SQL);
    await client.exec(setupSql);
    const before = await client.query<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations');
    await migrate(drizzle(client), { migrationsFolder });
    const after = await client.query<{ n: number }>('select count(*)::int as n from drizzle.__drizzle_migrations');
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
  });

  it('turns on row-level security for every table (including Drizzle bookkeeping), and gives signed-out visitors nothing', async () => {
    const client = new PGlite();
    await client.exec(SUPABASE_TEST_SHIM_SQL);
    await client.exec(setupSql);
    const open = await client.query<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname in ('public', 'drizzle') and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(open.rows).toEqual([]);
    const anon = await client.query<{ n: number }>(
      `select count(*)::int as n from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'`,
    );
    expect(anon.rows[0]!.n).toBe(0);
  });

  it('is up to date with the migrations folder', async () => {
    const { execFileSync } = await import('node:child_process');
    const script = new URL('../scripts/supabase-setup-sql.mjs', import.meta.url).pathname;
    execFileSync('node', [script]);
    expect(readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8')).toBe(setupSql);
  });
});
