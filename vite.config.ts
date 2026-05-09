import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { open: true },
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
