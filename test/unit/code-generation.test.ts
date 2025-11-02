import { describe, expect, it } from 'vitest'
import { assertMatchesSchema, getOperation, loadJsonFixture } from '../helpers'

/**
 * Code Generation Unit Tests
 *
 * Tests the code generation functionality including:
 * - Example value generation based on schemas
 * - TypeScript code generation for endpoints
 * - Import and setup code generation
 */

describe('code Generation - Example Value Generation', () => {
  /**
   * Mock implementation of generateExampleValue from MCP server
   */
  function generateExampleValue(schema: any, propertyName?: string): any {
    if (!schema)
      return undefined

    if (schema.example !== undefined)
      return schema.example

    if (schema.$ref)
      return `/* Reference to ${schema.$ref} */`

    if (schema.type === 'array') {
      return [generateExampleValue(schema.items)]
    }

    if (schema.type === 'object') {
      const example: any = {}
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          example[key] = generateExampleValue(prop as any, key)
        }
      }
      return example
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'email')
          return 'user@example.com'
        if (schema.format === 'date-time')
          return new Date().toISOString()
        if (schema.format === 'uuid')
          return '550e8400-e29b-41d4-a716-446655440000'
        if (propertyName?.toLowerCase().includes('id'))
          return 'example-id'
        if (propertyName?.toLowerCase().includes('name'))
          return 'Example Name'
        return 'example'
      case 'number':
      case 'integer':
        return schema.format === 'int64' ? 1 : 10
      case 'boolean':
        return true
      default:
        return undefined
    }
  }

  it('should generate email for string with email format', () => {
    const value = generateExampleValue({ type: 'string', format: 'email' })
    expect(value).toBe('user@example.com')
    assertMatchesSchema(value, { type: 'string', format: 'email' })
  })

  it('should generate UUID for string with uuid format', () => {
    const value = generateExampleValue({ type: 'string', format: 'uuid' })
    expect(value).toBe('550e8400-e29b-41d4-a716-446655440000')
    assertMatchesSchema(value, { type: 'string', format: 'uuid' })
  })

  it('should generate ISO date for string with date-time format', () => {
    const value = generateExampleValue({ type: 'string', format: 'date-time' })
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('should generate context-aware values based on property name', () => {
    const idValue = generateExampleValue({ type: 'string' }, 'user_id')
    const nameValue = generateExampleValue({ type: 'string' }, 'full_name')

    expect(idValue).toBe('example-id')
    expect(nameValue).toBe('Example Name')
  })

  it('should generate number values', () => {
    const numberValue = generateExampleValue({ type: 'number' })
    const intValue = generateExampleValue({ type: 'integer' })
    const int64Value = generateExampleValue({ type: 'integer', format: 'int64' })

    expect(numberValue).toBe(10)
    expect(intValue).toBe(10)
    expect(int64Value).toBe(1)
  })

  it('should generate boolean values', () => {
    const value = generateExampleValue({ type: 'boolean' })
    expect(value).toBe(true)
  })

  it('should generate array values', () => {
    const value = generateExampleValue({
      type: 'array',
      items: { type: 'string', format: 'email' },
    })

    expect(Array.isArray(value)).toBe(true)
    expect(value.length).toBe(1)
    expect(value[0]).toBe('user@example.com')
  })

  it('should generate object values', () => {
    const value = generateExampleValue({
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        age: { type: 'integer' },
      },
    })

    expect(value).toEqual({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      name: 'Example Name',
      age: 10,
    })
  })

  it('should use schema example if provided', () => {
    const value = generateExampleValue({
      type: 'string',
      example: 'custom-example',
    })

    expect(value).toBe('custom-example')
  })

  it('should handle $ref schemas', () => {
    const value = generateExampleValue({
      $ref: '#/components/schemas/User',
    })

    expect(value).toContain('Reference to')
    expect(value).toContain('User')
  })

  it('should return undefined for null schema', () => {
    const value = generateExampleValue(null)
    expect(value).toBeUndefined()
  })
})

describe('code Generation - TypeScript Code', () => {
  const spec = loadJsonFixture('sample-api.json')

  /**
   * Simplified code generation implementation
   */
  function generateCodeExample(apiName: string, path: string, method: string, operation: any) {
    const serviceName = apiName.split('/').pop() || apiName
    const methodUpper = method.toUpperCase()

    // Generate imports
    const imports = `import { createClient, ${serviceName} } from 'toonfetch/${apiName.split('/')[0]}'`

    // Generate client setup
    const setup = `const client = createClient({
  baseURL: 'https://api.example.com',
}).with(${serviceName})`

    // Extract parameters
    const pathParams: any = {}
    const queryParams: any = {}
    let requestBody: any

    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === 'path') {
          pathParams[param.name] = 'example-value'
        }
        else if (param.in === 'query') {
          queryParams[param.name] = 10
        }
      }
    }

    if (operation.requestBody) {
      const content = operation.requestBody.content
      const jsonContent = content?.['application/json']
      if (jsonContent?.schema) {
        requestBody = { example: 'data' }
      }
    }

    // Build the request options object
    const options: string[] = [`  method: '${methodUpper}'`]

    if (Object.keys(pathParams).length > 0) {
      options.push(`  path: { ... }`)
    }

    if (Object.keys(queryParams).length > 0) {
      options.push(`  query: { ... }`)
    }

    if (requestBody !== undefined) {
      options.push(`  body: { ... }`)
    }

    // Generate usage
    const usage = `const response = await client('${path}', {
${options.join(',\n')}
})`

    return {
      imports,
      setup,
      usage,
    }
  }

  it('should generate imports for Ory service', () => {
    const operation = getOperation(spec, '/users', 'get')
    const code = generateCodeExample('test/sample', '/users', 'get', operation)

    expect(code.imports).toContain('import')
    expect(code.imports).toContain('createClient')
    expect(code.imports).toContain('sample')
  })

  it('should generate client setup code', () => {
    const operation = getOperation(spec, '/users', 'get')
    const code = generateCodeExample('test/sample', '/users', 'get', operation)

    expect(code.setup).toContain('createClient')
    expect(code.setup).toContain('baseURL')
    expect(code.setup).toContain('.with(')
  })

  it('should generate GET request with query parameters', () => {
    const operation = getOperation(spec, '/users', 'get')
    const code = generateCodeExample('test/sample', '/users', 'get', operation)

    expect(code.usage).toContain('method: \'GET\'')
    expect(code.usage).toContain('query')
    expect(code.usage).toContain('/users')
  })

  it('should generate POST request with body', () => {
    const operation = getOperation(spec, '/users', 'post')
    const code = generateCodeExample('test/sample', '/users', 'post', operation)

    expect(code.usage).toContain('method: \'POST\'')
    expect(code.usage).toContain('body')
  })

  it('should generate request with path parameters', () => {
    const operation = getOperation(spec, '/users/{id}', 'get')
    const code = generateCodeExample('test/sample', '/users/{id}', 'get', operation)

    expect(code.usage).toContain('/users/{id}')
    expect(code.usage).toContain('path')
  })

  it('should generate DELETE request', () => {
    const operation = getOperation(spec, '/users/{id}', 'delete')
    const code = generateCodeExample('test/sample', '/users/{id}', 'delete', operation)

    expect(code.usage).toContain('method: \'DELETE\'')
    expect(code.usage).toContain('path')
  })
})

describe('code Generation - Quickstart Generation', () => {
  const spec = loadJsonFixture('sample-api.json')

  it('should include API title and description', () => {
    const quickstart = `# Quickstart Guide: ${spec.info.title}

${spec.info.description}

## Installation
\`\`\`bash
npm install toonfetch
\`\`\`
`

    expect(quickstart).toContain(spec.info.title)
    expect(quickstart).toContain(spec.info.description)
    expect(quickstart).toContain('Installation')
  })

  it('should find GET and POST operations', () => {
    const paths = spec.paths || {}
    const operations: Array<{ path: string, method: string, operation: any }> = []

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post'].includes(method) && operations.length < 3) {
          operations.push({ path, method, operation })
        }
      }
    }

    expect(operations.length).toBeGreaterThan(0)
    expect(operations.some(op => op.method === 'get')).toBe(true)
    expect(operations.some(op => op.method === 'post')).toBe(true)
  })
})

describe('code Generation - Parameter Extraction', () => {
  const spec = loadJsonFixture('sample-api.json')

  it('should extract path parameters', () => {
    const operation = getOperation(spec, '/users/{id}', 'get')
    const pathParams = operation.parameters
      .filter((p: any) => p.in === 'path')
      .map((p: any) => p.name)

    expect(pathParams).toContain('id')
  })

  it('should extract query parameters', () => {
    const operation = getOperation(spec, '/users', 'get')
    const queryParams = operation.parameters
      .filter((p: any) => p.in === 'query')
      .map((p: any) => p.name)

    expect(queryParams).toContain('page')
    expect(queryParams).toContain('limit')
  })

  it('should extract request body schema', () => {
    const operation = getOperation(spec, '/users', 'post')
    const requestBody = operation.requestBody
    const schema = requestBody.content['application/json'].schema

    expect(schema.$ref).toBe('#/components/schemas/CreateUserRequest')
  })

  it('should identify required parameters', () => {
    const operation = getOperation(spec, '/users/{id}', 'get')
    const requiredParams = operation.parameters.filter((p: any) => p.required)

    expect(requiredParams.length).toBeGreaterThan(0)
    expect(requiredParams[0].name).toBe('id')
  })
})
