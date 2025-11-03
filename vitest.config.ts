import type { ViteUserConfigExport } from 'vitest/config'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const config: ViteUserConfigExport = defineConfig({
  test: {
    // Enable globals for describe, it, expect, etc.
    globals: true,

    // Environment for running tests (node for backend code)
    environment: 'node',

    // Test file patterns
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/**/*.ts',
        'scripts/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        '**/dist/**',
        '**/node_modules/**',
        'playground/**',
      ],
      // Coverage thresholds (adjust as needed)
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },

    // Test timeout (useful for integration tests)
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Reporter configuration
    reporters: ['verbose'],

    // Retry failed tests (useful for flaky tests)
    retry: 0,

    // Run tests in sequence for integration tests
    // Set to false for faster unit tests
    sequence: {
      concurrent: false,
    },
  },

  // Resolve aliases (matches tsconfig paths)
  resolve: {
    alias: {
      'sufetch/ory': resolve(__dirname, './openapi-specs/ory'),
    },
  },
})

export default config
