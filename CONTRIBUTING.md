# Contributing to SuFetch

Thank you for your interest in contributing to SuFetch! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Adding New API Specifications](#adding-new-api-specifications)
- [Project Structure](#project-structure)

## Code of Conduct

###  Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or discriminatory comments
- Personal or political attacks
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **pnpm** 9.15+ ([install pnpm](https://pnpm.io/installation))
- **Git**
- A code editor (we recommend [VS Code](https://code.visualstudio.com/))

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/productdevbook/sufetch.git
cd sufetch
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/original/sufetch.git
```

### Install Dependencies

```bash
pnpm install
```

### Build the Project

```bash
pnpm build
```

This runs the complete build pipeline:
1. Converts OpenAPI JSON specs to TOON format
2. Generates TypeScript types
3. Updates package.json exports
4. Bundles the code
5. Copies type definitions

### Verify Setup

```bash
# Run tests
pnpm test

# Run type checking
pnpm test:types

# Run linter
pnpm lint
```

All commands should complete without errors.

## Development Workflow

### Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test improvements
- `chore/` - Build process, dependencies, etc.

### Make Changes

1. Make your changes in your feature branch
2. Add or update tests as needed
3. Update documentation if needed
4. Ensure all tests pass: `pnpm test`
5. Ensure linting passes: `pnpm lint:fix`

### Keep Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Merge upstream/main into your branch
git merge upstream/main

# Or rebase (if you prefer)
git rebase upstream/main
```

## Testing

**All contributions must include tests.**

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Open coverage report
open coverage/index.html  # macOS
start coverage/index.html # Windows
```

### Test Structure

```
test/
├── unit/              # Unit tests
│   ├── mcp-server.test.ts
│   └── code-generation.test.ts
├── integration/       # Integration tests
│   └── build-pipeline.test.ts
├── fixtures/          # Test data
│   ├── sample-api.json
│   └── sample-api.toon
└── helpers.ts         # Test utilities
```

### Writing Tests

Use Vitest:

```typescript
import { describe, expect, it } from 'vitest'

describe('MyFeature', () => {
  it('should do something', () => {
    const result = myFunction()
    expect(result).toBe(expectedValue)
  })
})
```

### Test Coverage Goals

- **Lines**: 60%+
- **Functions**: 60%+
- **Branches**: 60%+
- **Statements**: 60%+

## Coding Standards

### TypeScript

- Use **strict mode** (already configured)
- Prefer **explicit types** over `any`
- Use **interfaces** for object shapes
- Use **const** over `let` when possible
- Use **async/await** over promises

**Good:**
```typescript
interface User {
  id: string
  email: string
}

async function getUser(id: string): Promise<User> {
  return await client('/users/{id}', {
    method: 'GET',
    path: { id }
  })
}
```

**Bad:**
```typescript
function getUser(id: any): any {
  return client('/users/{id}', {
    method: 'GET',
    path: { id }
  }).then(user => user)
}
```

### Linting

We use [@antfu/eslint-config](https://github.com/antfu/eslint-config):

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

**Always run `pnpm lint:fix` before committing.**

### File Organization

- One component/function per file (when reasonable)
- Group related files in directories
- Use `index.ts` for public exports
- Keep test files next to source files or in `test/`

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Functions**: `camelCase()`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase`
- **Types**: `PascalCase`

### Comments and Documentation

- Use **JSDoc** for public APIs
- Add comments for complex logic
- Update README if you change user-facing features

**Example:**
```typescript
/**
 * Generate example values based on OpenAPI schema.
 *
 * @param schema - OpenAPI schema definition
 * @param propertyName - Optional property name for context
 * @returns Generated example value
 *
 * @example
 * ```typescript
 * generateExampleValue({ type: 'string', format: 'email' })
 * // Returns: 'user@example.com'
 * ```
 */
function generateExampleValue(schema: any, propertyName?: string): any {
  // ...
}
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.
- `perf`: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat: add GitHub API support"
git commit -m "feat(mcp): add new search_by_tag tool"

# Bug fix
git commit -m "fix: correct TOON decoding for nested objects"
git commit -m "fix(types): resolve type inference for path parameters"

# Documentation
git commit -m "docs: update README with npx example"

# Chore
git commit -m "chore: upgrade dependencies"
git commit -m "chore(test): add coverage reporting"
```

### Commit Message Guidelines

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor to..." not "moves cursor to...")
- Keep subject line under 72 characters
- Reference issues and PRs in footer: `Fixes #123`

## Pull Request Process

### Before Submitting

1. ✅ All tests pass (`pnpm test`)
2. ✅ Linting passes (`pnpm lint`)
3. ✅ Type checking passes (`pnpm test:types`)
4. ✅ Build succeeds (`pnpm build`)
5. ✅ Documentation updated (if needed)
6. ✅ Commits follow conventional commits format

### Submit PR

1. Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```

2. Go to GitHub and create a Pull Request

3. Fill out the PR template:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How was this tested?
   - **Screenshots**: If UI changes (not applicable for SuFetch)
   - **Checklist**: Complete the checklist

### PR Title Format

Follow conventional commits:
```
feat: add support for GitHub API
fix: resolve TOON parsing issue with arrays
docs: improve MCP setup guide
```

### Review Process

- A maintainer will review your PR
- Address feedback by pushing new commits
- Once approved, a maintainer will merge

### After Merge

1. Delete your feature branch (on GitHub and locally)
2. Pull the latest main:
```bash
git checkout main
git pull upstream main
```

## Adding New API Specifications

Want to add support for a new API? Great! Here's how:

### 1. Create Service Directory

```bash
mkdir -p openapi-specs/your-api-name
```

### 2. Add OpenAPI Spec

Add your OpenAPI JSON file:
```bash
cp ~/your-api.json openapi-specs/your-api-name/your-api.json
```

**Requirements:**
- Must be valid OpenAPI 3.0+ JSON
- Should have descriptive operation IDs
- Should include schemas for all models

### 3. Create apiful Config

```typescript
// openapi-specs/your-api-name/apiful.config.ts
import { defineConfig } from 'apiful'

export default defineConfig({
  openapis: {
    yourApi: {  // Must match filename (without .json)
      filepath: './your-api.json'
    }
  },
  output: './types.d.ts'
})
```

### 4. Create Index File

```typescript
// openapi-specs/your-api-name/index.ts
import { createClient as apifulCreateClient, OpenAPIBuilder } from 'apiful'

export { apifulCreateClient as createClient }
export const yourApi = OpenAPIBuilder<'yourApi'>()
export default { yourApi }
```

### 5. Build and Test

```bash
# Build (this auto-generates types and TOON files)
pnpm build

# Verify files were created
ls openapi-specs/your-api-name/
# Should show: your-api.json, your-api.toon, types.d.ts

# Test in playground
cd playground
# Create test file and try your API
```

### 6. Add Tests

Add tests for your API in `test/integration/`:

```typescript
describe('Your API Integration', () => {
  it('should have TOON file', () => {
    const toonPath = join(SPECS_DIR, 'your-api-name/your-api.toon')
    expect(existsSync(toonPath)).toBe(true)
  })
})
```

### 7. Update Documentation

Add your API to the "Supported APIs" section in README.md.

### 8. Submit PR

Follow the [Pull Request Process](#pull-request-process) above.

## Project Structure

Understanding the project structure helps you navigate and contribute:

```
sufetch/
├── .github/              # GitHub Actions (future)
├── src/
│   └── mcp-server.ts     # MCP server implementation
├── scripts/
│   ├── convert-to-toon.ts       # JSON → TOON conversion
│   ├── generate-types.ts        # Generate TypeScript types
│   ├── update-exports.ts        # Update package.json exports
│   ├── copy-types.ts            # Copy types to dist/
│   └── add-type-references.ts   # Add /// <reference> directives
├── openapi-specs/
│   └── {service-name}/
│       ├── {api}.json           # OpenAPI spec (source)
│       ├── {api}.toon           # Compressed TOON (generated)
│       ├── apiful.config.ts     # Type generation config
│       ├── index.ts             # Client exports
│       └── types.d.ts           # Generated types
├── test/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── fixtures/        # Test data
│   └── helpers.ts       # Test utilities
├── playground/
│   └── index.ts         # Usage examples (not published)
├── dist/                # Compiled output (generated)
│   ├── {service}.js     # Bundled client
│   ├── {service}.d.ts   # Type definitions
│   └── mcp-server.js    # MCP server executable
├── package.json         # Package metadata (exports auto-updated)
├── tsconfig.json        # TypeScript configuration
├── tsdown.config.ts     # Build configuration
├── vitest.config.ts     # Test configuration
├── eslint.config.mjs    # Linting configuration
├── README.md            # User documentation
├── CLAUDE.md            # AI assistant documentation
└── CONTRIBUTING.md      # This file
```

### Important Files

- **`package.json` exports** - Auto-generated, don't edit manually
- **Build scripts** - Run in specific order (see `pnpm build`)
- **TOON files** - Auto-generated from JSON, don't edit manually
- **Type files** - Auto-generated by apiful, don't edit manually

## Questions?

- Check [CLAUDE.md](./CLAUDE.md) for detailed project documentation
- Search [existing issues](https://github.com/productdevbook/sufetch/issues)
- Create a [new discussion](https://github.com/productdevbook/sufetch/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to SuFetch!** 🎉
