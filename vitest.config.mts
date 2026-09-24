import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DEV__: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', 'docs/**', 'dist/**'],
  },
});
