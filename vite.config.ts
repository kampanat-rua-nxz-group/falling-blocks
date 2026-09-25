import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  base: mode === 'ghpages' ? '/falling-blocks/' : '/',
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/game/**/*.ts', 'src/storage/**/*.ts', 'src/ui/gestures.ts'],
      exclude: ['**/*.test.ts', 'src/game/types.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
}));
