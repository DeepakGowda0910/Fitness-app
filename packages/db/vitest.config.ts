import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Each test starts a fresh in-process Postgres. On a CI runner that is also
    // testing the other packages in parallel, that setup can pass Vitest's 10 s
    // default, so allow more time. The checks themselves are unchanged.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
