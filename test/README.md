# Test Directory

This directory contains the test suite for ToonFetch.

## Structure

```
test/
├── fixtures/              # Test fixtures (sample API specs)
│   ├── sample-api.json    # Sample OpenAPI spec in JSON
│   └── sample-api.toon    # Sample OpenAPI spec in TOON format
├── unit/                  # Unit tests
│   ├── mcp-server.test.ts
│   ├── code-generation.test.ts
│   └── example-value-generator.test.ts
├── integration/           # Integration tests
│   └── build-pipeline.test.ts
├── helpers.ts             # Test helper utilities
└── README.md              # This file
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run only unit tests
pnpm test test/unit

# Run only integration tests
pnpm test test/integration
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions or components in isolation:

```typescript
import { describe, expect, it } from 'vitest'
import { loadJsonFixture } from '../helpers'

describe('MyComponent', () => {
  it('should do something', () => {
    const spec = loadJsonFixture('sample-api.json')
    expect(spec.info.title).toBe('Sample Test API')
  })
})
```

### Integration Tests

Integration tests should test complete workflows:

```typescript
import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('Build Pipeline', () => {
  it('should convert JSON to TOON', () => {
    const output = execSync('pnpm convert:toon', { encoding: 'utf-8' })
    expect(output).toContain('Conversion complete')
  })
})
```

## Test Helpers

The `helpers.ts` file provides useful utilities:

- `loadFixture(filename)` - Load a fixture file
- `loadJsonFixture(filename)` - Load and parse JSON fixture
- `loadToonFixture(filename)` - Load and decode TOON fixture
- `createMockMCPRequest(name, args)` - Create mock MCP requests
- `assertMatchesSchema(value, schema)` - Validate values against OpenAPI schemas
- `getOperation(spec, path, method)` - Extract operations from specs
- `getSchema(spec, schemaName)` - Extract schemas from specs
- `createMinimalSpec(overrides)` - Create minimal specs for testing

## Fixtures

### sample-api.json / sample-api.toon

A minimal API specification for testing purposes. Includes:

- `/users` GET (list users with pagination)
- `/users` POST (create user)
- `/users/{id}` GET (get user by ID)
- `/users/{id}` DELETE (delete user)
- User and CreateUserRequest schemas

Use these fixtures to test:
- Spec loading and parsing
- Code generation
- Example value generation
- MCP server tools

## Coverage

Coverage reports are generated in the `coverage/` directory. Aim for:
- Lines: 60%+
- Functions: 60%+
- Branches: 60%+
- Statements: 60%+

View coverage report: `open coverage/index.html`
