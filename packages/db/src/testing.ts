import { fileURLToPath } from 'node:url';

/** Absolute path of this package's SQL migrations, for migrate() in other packages. */
export const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));

/**
 * Minimal stand-in for what Supabase provides before our migrations run:
 * the auth schema with auth.uid() and the auth.users columns we use, and the
 * anon/authenticated roles.
 * Supabase's real auth.uid() also reads the `sub` claim of request.jwt.claims.
 * For local tests only; never run against Supabase.
 */
export const SUPABASE_TEST_SHIM_SQL = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE SCHEMA auth;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $$;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY,
    email text,
    last_sign_in_at timestamptz,
    banned_until timestamptz
  );
`;

/** Supabase's default privileges grant table access to these roles; RLS then filters rows. */
export const SUPABASE_TEST_GRANTS_SQL = `
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
`;
