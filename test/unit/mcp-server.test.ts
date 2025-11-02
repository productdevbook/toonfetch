import { decode } from '@toon-format/toon'
import { describe, expect, it } from 'vitest'
import { getOperation, getSchema, loadJsonFixture, loadToonFixture } from '../helpers'

/**
 * MCP Server Unit Tests
 *
 * Tests the core functionality of the ToonFetch MCP server including:
 * - Spec loading and parsing
 * - Tool handler logic
 * - Error handling
 *
 * Note: These tests don't instantiate the actual MCP server to avoid
 * stdio transport complications. Instead, they test the underlying logic.
 */

describe('mCP Server - Spec Loading', () => {
  it('should load and parse JSON fixture', () => {
    const spec = loadJsonFixture('sample-api.json')

    expect(spec).toBeDefined()
    expect(spec.openapi).toBe('3.0.0')
    expect(spec.info.title).toBe('Sample Test API')
    expect(spec.info.version).toBe('1.0.0')
  })

  it('should load and decode TOON fixture', () => {
    const spec = loadToonFixture('sample-api.toon')

    expect(spec).toBeDefined()
    expect(spec.openapi).toBe('3.0.0')
    expect(spec.info.title).toBe('Sample Test API')
  })

  it('should have equivalent JSON and TOON specs', () => {
    const jsonSpec = loadJsonFixture('sample-api.json')
    const toonSpec = loadToonFixture('sample-api.toon')

    // Key properties should match
    expect(toonSpec.info.title).toBe(jsonSpec.info.title)
    expect(toonSpec.info.version).toBe(jsonSpec.info.version)
    expect(Object.keys(toonSpec.paths)).toEqual(Object.keys(jsonSpec.paths))
  })

  it('should contain expected paths', () => {
    const spec = loadJsonFixture('sample-api.json')

    expect(spec.paths).toHaveProperty('/users')
    expect(spec.paths).toHaveProperty('/users/{id}')
  })

  it('should contain expected HTTP methods', () => {
    const spec = loadJsonFixture('sample-api.json')

    expect(spec.paths['/users']).toHaveProperty('get')
    expect(spec.paths['/users']).toHaveProperty('post')
    expect(spec.paths['/users/{id}']).toHaveProperty('get')
    expect(spec.paths['/users/{id}']).toHaveProperty('delete')
  })

  it('should contain component schemas', () => {
    const spec = loadJsonFixture('sample-api.json')

    expect(spec.components.schemas).toHaveProperty('User')
    expect(spec.components.schemas).toHaveProperty('CreateUserRequest')
  })
})

describe('mCP Server - API Info Extraction', () => {
  it('should extract API info', () => {
    const spec = loadJsonFixture('sample-api.json')

    const info = {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      servers: spec.servers || [],
    }

    expect(info.title).toBe('Sample Test API')
    expect(info.version).toBe('1.0.0')
    expect(info.description).toBe('A minimal API spec for testing purposes')
    expect(info.servers).toHaveLength(1)
    expect(info.servers[0].url).toBe('https://api.example.com')
  })

  it('should handle missing optional fields', () => {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'Minimal API',
        version: '1.0.0',
      },
      paths: {},
    }

    const info = {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      servers: spec.servers || [],
    }

    expect(info.description).toBeUndefined()
    expect(info.servers).toEqual([])
  })
})

describe('mCP Server - Endpoint Search', () => {
  const spec = loadJsonFixture('sample-api.json')

  it('should find endpoints by path query', () => {
    const results: any[] = []
    const query = 'users'

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation as any
          if (path.toLowerCase().includes(query.toLowerCase())) {
            results.push({ path, method: method.toUpperCase(), operation: op })
          }
        }
      }
    }

    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.path.includes('users'))).toBe(true)
  })

  it('should find endpoints by summary query', () => {
    const results: any[] = []
    const query = 'list'

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          const op = operation as any
          if (op.summary?.toLowerCase().includes(query.toLowerCase())) {
            results.push({ path, method, summary: op.summary })
          }
        }
      }
    }

    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.summary.toLowerCase().includes('list'))).toBe(true)
  })

  it('should filter endpoints by HTTP method', () => {
    const results: any[] = []
    const targetMethod = 'post'

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (method.toLowerCase() === targetMethod) {
          results.push({ path, method: method.toUpperCase(), operation })
        }
      }
    }

    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.method === 'POST')).toBe(true)
  })
})

describe('mCP Server - Endpoint Details', () => {
  const spec = loadJsonFixture('sample-api.json')

  it('should extract GET endpoint with query parameters', () => {
    const operation = getOperation(spec, '/users', 'get')

    expect(operation.operationId).toBe('listUsers')
    expect(operation.summary).toBe('List all users')
    expect(operation.parameters).toBeDefined()
    expect(operation.parameters.length).toBe(2)
    expect(operation.parameters[0].name).toBe('page')
    expect(operation.parameters[1].name).toBe('limit')
  })

  it('should extract POST endpoint with request body', () => {
    const operation = getOperation(spec, '/users', 'post')

    expect(operation.operationId).toBe('createUser')
    expect(operation.summary).toBe('Create a new user')
    expect(operation.requestBody).toBeDefined()
    expect(operation.requestBody.required).toBe(true)

    const schema = operation.requestBody.content['application/json'].schema
    expect(schema.$ref).toBe('#/components/schemas/CreateUserRequest')
  })

  it('should extract endpoint with path parameters', () => {
    const operation = getOperation(spec, '/users/{id}', 'get')

    expect(operation.operationId).toBe('getUser')
    expect(operation.parameters).toBeDefined()
    expect(operation.parameters.length).toBe(1)
    expect(operation.parameters[0].name).toBe('id')
    expect(operation.parameters[0].in).toBe('path')
    expect(operation.parameters[0].required).toBe(true)
    expect(operation.parameters[0].schema.format).toBe('uuid')
  })

  it('should handle DELETE endpoint without request body', () => {
    const operation = getOperation(spec, '/users/{id}', 'delete')

    expect(operation.operationId).toBe('deleteUser')
    expect(operation.requestBody).toBeUndefined()
    expect(operation.parameters.length).toBe(1)
  })
})

describe('mCP Server - Schema Details', () => {
  const spec = loadJsonFixture('sample-api.json')

  it('should extract User schema', () => {
    const schema = getSchema(spec, 'User')

    expect(schema.type).toBe('object')
    expect(schema.required).toContain('id')
    expect(schema.required).toContain('email')
    expect(schema.required).toContain('name')
    expect(schema.properties.id.type).toBe('string')
    expect(schema.properties.id.format).toBe('uuid')
    expect(schema.properties.email.format).toBe('email')
  })

  it('should extract CreateUserRequest schema', () => {
    const schema = getSchema(spec, 'CreateUserRequest')

    expect(schema.type).toBe('object')
    expect(schema.required).toContain('email')
    expect(schema.required).toContain('name')
    expect(schema.properties.email.format).toBe('email')
  })

  it('should throw error for non-existent schema', () => {
    expect(() => getSchema(spec, 'NonExistentSchema')).toThrow('Schema not found')
  })
})

describe('mCP Server - Error Handling', () => {
  const spec = loadJsonFixture('sample-api.json')

  it('should handle missing path', () => {
    expect(() => getOperation(spec, '/non-existent', 'get')).toThrow('Path not found')
  })

  it('should handle missing method', () => {
    expect(() => getOperation(spec, '/users', 'patch')).toThrow('Method patch not found')
  })

  it('should handle invalid TOON content', () => {
    // TOON decode might not throw for all invalid content
    // It may return an empty object or malformed data
    const result = decode('invalid toon content')

    // The result should not be a valid OpenAPI spec
    expect(result?.openapi).toBeUndefined()
  })
})

describe('mCP Server - Service Name Extraction', () => {
  it('should extract service name from API identifier', () => {
    const getApiServiceName = (apiName: string): string => {
      return apiName.split('/').pop() || apiName
    }

    expect(getApiServiceName('ory/kratos')).toBe('kratos')
    expect(getApiServiceName('ory/hydra')).toBe('hydra')
    expect(getApiServiceName('standalone-api')).toBe('standalone-api')
  })
})

describe('mCP Server - Base URL Generation', () => {
  it('should generate appropriate base URL examples', () => {
    const getBaseUrlExample = (apiName: string): string => {
      return apiName.includes('kratos')
        ? 'https://your-kratos-instance.com'
        : apiName.includes('hydra')
          ? 'https://your-hydra-instance.com'
          : 'https://api.example.com'
    }

    expect(getBaseUrlExample('ory/kratos')).toBe('https://your-kratos-instance.com')
    expect(getBaseUrlExample('ory/hydra')).toBe('https://your-hydra-instance.com')
    expect(getBaseUrlExample('other/api')).toBe('https://api.example.com')
  })
})
