import { z } from 'zod';

const envSchema = z
  .object({
    /** Postgres connection string (Supabase: Project settings → Database → Connection string). */
    DATABASE_URL: z.string().min(1),
    /** e.g. https://<project-ref>.supabase.co. Sign-in tokens are checked against its public keys. */
    SUPABASE_URL: z.url().optional(),
    /** Only for projects still on the legacy shared secret (HS256). Never commit it. */
    SUPABASE_JWT_SECRET: z.string().min(32).optional(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    /** Comma-separated origins allowed to call the API from a browser. */
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
  })
  .refine((e) => e.SUPABASE_URL || e.SUPABASE_JWT_SECRET, {
    message: 'Set SUPABASE_URL (recommended) or SUPABASE_JWT_SECRET',
  });

export type AppConfig = z.output<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`);
    throw new Error(`Invalid API configuration:\n  ${problems.join('\n  ')}`);
  }
  return parsed.data;
}
