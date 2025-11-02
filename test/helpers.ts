import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decode } from '@toon-format/toon'

/**
 * Test helper utilities for ToonFetch tests.
 */

/**
 * Load a fixture file from the test/fixtures directory.
 *
 * @param filename - Name of the fixture file
 * @returns File contents as a string
 */
export function loadFixture(filename: string): string {
  const fixturePath = join(__dirname, 'fixtures', filename)
  return readFileSync(fixturePath, 'utf-8')
}

/**
 * Load and parse a JSON fixture.
 *
 * @param filename - Name of the JSON fixture file
 * @returns Parsed JSON object
 */
export function loadJsonFixture(filename: string): any {
  const content = loadFixture(filename)
  return JSON.parse(content)
}

/**
 * Load and decode a TOON fixture.
 *
 * @param filename - Name of the TOON fixture file
 * @returns Decoded OpenAPI specification object
 */
export function loadToonFixture(filename: string): any {
  const content = loadFixture(filename)
  return decode(content)
}

/**
 * Create a mock MCP request object.
 *
 * @param name - Tool name
 * @param args - Tool arguments
 * @returns Mock MCP request object
 */
export function createMockMCPRequest(name: string, args: Record<string, any> = {}) {
  return {
    params: {
      name,
      arguments: args,
    },
  }
}

/**
 * Assert that a value matches an OpenAPI schema type.
 *
 * @param value - Value to test
 * @param schema - OpenAPI schema definition
 */
export function assertMatchesSchema(value: any, schema: any): void {
  if (!schema) {
    throw new Error('Schema is required')
  }

  const { type, format } = schema

  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new TypeError(`Expected string, got ${typeof value}`)
      }
      if (format === 'email' && !value.includes('@')) {
        throw new Error(`Expected email format, got: ${value}`)
      }
      if (format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error(`Expected UUID format, got: ${value}`)
      }
      break

    case 'number':
    case 'integer':
      if (typeof value !== 'number') {
        throw new TypeError(`Expected number, got ${typeof value}`)
      }
      if (type === 'integer' && !Number.isInteger(value)) {
        throw new Error(`Expected integer, got: ${value}`)
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new TypeError(`Expected boolean, got ${typeof value}`)
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        throw new TypeError(`Expected array, got ${typeof value}`)
      }
      break

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`Expected object, got ${typeof value}`)
      }
      break

    default:
      throw new Error(`Unknown schema type: ${type}`)
  }
}

/**
 * Extract operation from OpenAPI spec by path and method.
 *
 * @param spec - OpenAPI specification object
 * @param path - Endpoint path
 * @param method - HTTP method
 * @returns Operation object
 */
export function getOperation(spec: any, path: string, method: string): any {
  const pathItem = spec.paths?.[path]
  if (!pathItem) {
    throw new Error(`Path not found: ${path}`)
  }

  const operation = pathItem[method.toLowerCase()]
  if (!operation) {
    throw new Error(`Method ${method} not found for path ${path}`)
  }

  return operation
}

/**
 * Extract schema from OpenAPI spec by name.
 *
 * @param spec - OpenAPI specification object
 * @param schemaName - Schema name from components/schemas
 * @returns Schema object
 */
export function getSchema(spec: any, schemaName: string): any {
  const schema = spec.components?.schemas?.[schemaName]
  if (!schema) {
    throw new Error(`Schema not found: ${schemaName}`)
  }

  return schema
}

/**
 * Create a minimal OpenAPI spec for testing.
 *
 * @param overrides - Optional overrides for the spec
 * @returns Minimal OpenAPI specification
 */
export function createMinimalSpec(overrides: Partial<any> = {}): any {
  return {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      ...overrides.info,
    },
    paths: overrides.paths || {},
    components: overrides.components || {},
    ...overrides,
  }
}
