import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { migrationsFolder, SUPABASE_TEST_GRANTS_SQL, SUPABASE_TEST_SHIM_SQL } from '@fitness/db';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { SignJWT } from 'jose';
import { AppModule } from '../src/app.module.js';
import { supabaseTokenVerifier } from '../src/auth.js';
import type { Database } from '../src/database.js';

/** Test-only signing secret; never a real project's. */
export const TEST_SECRET = 'test-only-secret-not-used-anywhere-else-0123456789';

export async function createTestApp(): Promise<INestApplication> {
  const client = new PGlite();
  await client.exec(SUPABASE_TEST_SHIM_SQL);
  const db = drizzle(client);
  await migrate(db, { migrationsFolder });
  await client.exec(SUPABASE_TEST_GRANTS_SQL);

  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.register({
        db: db as unknown as Database,
        verifyToken: supabaseTokenVerifier({ SUPABASE_JWT_SECRET: TEST_SECRET }),
      }),
    ],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
}

export async function tokenFor(
  sub: string = randomUUID(),
  opts: { email?: string; audience?: string; secret?: string; expiresIn?: string } = {},
): Promise<string> {
  return new SignJWT({ email: opts.email ?? `${sub.slice(0, 8)}@example.com`, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setAudience(opts.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(opts.expiresIn ?? '1h')
    .sign(new TextEncoder().encode(opts.secret ?? TEST_SECRET));
}
