import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // beforeAll starts an in-process Postgres and applies every migration. On a
    // CI runner that is also testing the other packages in parallel, that can
    // pass Vitest's 10 s default (same fix as packages/db). Checks are unchanged.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
