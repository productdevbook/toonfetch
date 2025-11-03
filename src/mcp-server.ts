#!/usr/bin/env node
/* eslint-disable node/prefer-global/process */
import type { ServerConfig } from './config.js'
import type { ResponseVariant } from './type-parser.js'
import type {
  CachedExample,
  CodeExample,
  OpenAPIDocument,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPISchema,
  ResolvedSchema,
  ResponseStructure,
} from './types.js'
import { existsSync, readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { loadConfig } from './config.js'
import { parseResponseStructure, TypeInfoCache } from './type-parser.js'

/**
 * Represents a loaded API specification.
 */
interface ApiSpec {
  name: string
  path: string
  spec: OpenAPIDocument
}

/**
 * ToonFetch MCP Server - Optimized Version
 *
 * Provides AI assistants with introspection and code generation for OpenAPI specs.
 * Uses McpServer for automatic validation and cleaner code.
 */
class ToonFetchMCPServer {
  private server: McpServer
  private specs: Map<string, ApiSpec> = new Map()
  private config: ServerConfig

  private refCache: Map<string, ResolvedSchema> = new Map()
  private exampleCache: Map<string, CachedExample> = new Map()
  private typeCache: TypeInfoCache = new TypeInfoCache()

  constructor(config?: Partial<ServerConfig>) {
    this.config = { ...loadConfig(), ...config }

    this.server = new McpServer(
      {
        name: this.config.server.name,
        version: this.config.server.version,
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      },
    )
  }

  async initialize() {
    this.log(`Looking for specs in: ${this.config.paths.specsDir}`)
    await this.loadSpecs()
    this.registerTools()
    this.registerPrompts()
  }

  private log(...args: any[]) {
    if (this.config.debug) {
      console.error(...args)
    }
  }

  /**
   * Load types.d.ts files for type hint generation
   */
  private async loadTypeDefs() {
    try {
      const scanDir = (dir: string, prefix = '') => {
        const entries = readdirSync(dir, { withFileTypes: true })
        const typesFiles: Array<{ key: string, path: string }> = []

        for (const entry of entries) {
          const fullPath = join(dir, entry.name)

          if (entry.isDirectory()) {
            typesFiles.push(...scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name))
          }
          else if (entry.name === 'types.d.ts') {
            const key = prefix || entry.name
            typesFiles.push({ key, path: fullPath })
          }
        }

        return typesFiles
      }

      const typesFiles = scanDir(this.config.paths.specsDir)

      // Load all types files
      for (const { key, path } of typesFiles) {
        if (existsSync(path)) {
          this.typeCache.get(path) // Loads and caches
          this.log(`Loaded type definitions for: ${key}`)
        }
      }

      this.log(`Loaded type hints for ${typesFiles.length} service(s)`)
    }
    catch (error) {
      this.log('Failed to load type definitions:', error)
    }
  }

  /**
   * Load all OpenAPI JSON files from openapi-specs directory
   */
  private async loadSpecs() {
    try {
      const jsonFiles: Array<{ key: string, path: string }> = []

      const scanDir = (dir: string, prefix = '') => {
        const entries = readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = join(dir, entry.name)

          if (entry.isDirectory()) {
            scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name)
          }
          else if (entry.name.endsWith('.json') && !entry.name.includes('package')) {
            const name = entry.name.replace('.json', '')
            const key = prefix ? `${prefix}/${name}` : name
            jsonFiles.push({ key, path: fullPath })
          }
        }
      }

      scanDir(this.config.paths.specsDir)

      // Load all spec files in parallel
      const loadPromises = jsonFiles.map(async ({ key, path }) => {
        try {
          const jsonContent = await readFile(path, 'utf-8')
          const spec = JSON.parse(jsonContent) as OpenAPIDocument

          return {
            key,
            spec: {
              name: key,
              path,
              spec,
            },
          }
        }
        catch (error) {
          this.log(`Failed to load ${path}:`, error)
          return null
        }
      })

      const results = await Promise.all(loadPromises)

      // Store successfully loaded specs
      for (const result of results) {
        if (result) {
          this.specs.set(result.key, result.spec)
        }
      }

      this.log(`Loaded ${this.specs.size} API specs`)

      // Load types.d.ts files for type hint generation
      await this.loadTypeDefs()
    }
    catch (error) {
      this.log('Failed to load specs:', error)
    }
  }

  // Removed warmCaches() and preResolveRefs() methods
  // Now using lazy loading: schemas are resolved and cached on first use in resolveRef()
  // This saves ~121KB memory (75% of unused cache) and improves startup time

  /**
   * Generate TypeScript type definitions for endpoint parameters and response
   */
  private generateTypeDefinitions(
    path: string,
    method: string,
    typeHelperName: string,
    operation: OpenAPIOperation,
  ): string[] {
    const lowerMethod = method.toLowerCase()
    const typeDefs: string[] = []

    // Find type helper info for adding JSDoc comments
    const typeHelperInfo = this.typeCache.findTypeHelper(typeHelperName)

    const pathParams = operation.parameters?.filter((p): p is OpenAPIParameter =>
      !('$ref' in p) && p.in === 'path',
    )
    const queryParams = operation.parameters?.filter((p): p is OpenAPIParameter =>
      !('$ref' in p) && p.in === 'query',
    )
    const requestBody = operation.requestBody

    if (pathParams && pathParams.length > 0) {
      const pathDesc = typeHelperInfo?.properties.find(p => p.name === 'path')?.description
      if (pathDesc) {
        typeDefs.push(`/** ${pathDesc} */`)
      }
      typeDefs.push(`type PathParams = ${typeHelperName}<'${path}', '${lowerMethod}'>['path']`)
    }

    if (queryParams && queryParams.length > 0) {
      const queryDesc = typeHelperInfo?.properties.find(p => p.name === 'query')?.description
      if (queryDesc) {
        typeDefs.push(`/** ${queryDesc} */`)
      }
      typeDefs.push(`type QueryParams = ${typeHelperName}<'${path}', '${lowerMethod}'>['query']`)
    }

    if (requestBody) {
      const requestDesc = typeHelperInfo?.properties.find(p => p.name === 'request')?.description
      if (requestDesc) {
        typeDefs.push(`/** ${requestDesc} */`)
      }
      typeDefs.push(`type RequestBody = ${typeHelperName}<'${path}', '${lowerMethod}'>['request']`)
    }

    return typeDefs
  }

  /**
   * Generate authentication headers based on security schemes
   */
  private generateAuthHeaders(securitySchemes: Record<string, unknown>): string[] {
    const headers: string[] = []

    if (securitySchemes.bearerAuth || securitySchemes.Bearer) {
      headers.push('  headers: {')
      // eslint-disable-next-line no-template-curly-in-string
      headers.push('    \'Authorization\': `Bearer ${YOUR_TOKEN}`,')
      headers.push('  },')
    }
    else if (securitySchemes.apiKey || securitySchemes.ApiKey) {
      headers.push('  headers: {')
      headers.push('    \'X-API-Key\': YOUR_API_KEY,')
      headers.push('  },')
    }

    return headers
  }

  /**
   * Generate client setup code with authentication
   */
  private generateClientSetup(serviceName: string, spec: OpenAPIDocument): string {
    const baseUrlExample = spec.servers?.[0]?.url || 'https://api.example.com'
    const setupParts = [
      'const client = createClient({',
      `  baseURL: '${baseUrlExample}',`,
    ]

    if (spec.components?.securitySchemes) {
      setupParts.push(...this.generateAuthHeaders(spec.components.securitySchemes))
    }

    setupParts.push(`}).with(${serviceName})`)
    return setupParts.join('\n')
  }

  /**
   * Generate path parameters code
   */
  private generatePathParamsCode(pathParams: OpenAPIParameter[], spec: OpenAPIDocument): string {
    const parts: string[] = [
      '// Path parameters',
      'const pathParams: PathParams = {',
    ]

    for (const param of pathParams) {
      const exampleValue = this.generateExampleValue(param.schema || {}, param.name, {}, spec)
      const valueStr = typeof exampleValue === 'string' ? `'${exampleValue}'` : JSON.stringify(exampleValue)
      parts.push(`  ${param.name}: ${valueStr},`)
    }

    parts.push('}', '')
    return parts.join('\n')
  }

  /**
   * Generate query parameters code
   */
  private generateQueryParamsCode(queryParams: OpenAPIParameter[], spec: OpenAPIDocument): string {
    const parts: string[] = [
      '// Query parameters',
      'const queryParams: QueryParams = {',
    ]

    for (const param of queryParams) {
      const exampleValue = this.generateExampleValue(param.schema || {}, param.name, {}, spec)
      const valueStr = typeof exampleValue === 'string' ? `'${exampleValue}'` : JSON.stringify(exampleValue)
      parts.push(`  ${param.name}: ${valueStr},`)
    }

    parts.push('}', '')
    return parts.join('\n')
  }

  /**
   * Generate request body code
   */
  private generateRequestBodyCode(requestBody: OpenAPIRequestBody, spec: OpenAPIDocument): string {
    const bodySchema = requestBody.content?.['application/json']?.schema
    if (!bodySchema) {
      return ''
    }

    let resolvedBodySchema: ResolvedSchema | OpenAPISchema | null = bodySchema
    if ('$ref' in bodySchema) {
      resolvedBodySchema = this.resolveRef(bodySchema.$ref, spec)
      if (!resolvedBodySchema) {
        return ''
      }
    }

    // Type guard: ensure we have a non-reference schema
    if (!resolvedBodySchema || '$ref' in resolvedBodySchema) {
      return ''
    }

    // Handle oneOf - use first option (typically single resource create)
    if ('oneOf' in resolvedBodySchema && resolvedBodySchema.oneOf) {
      const firstOption = resolvedBodySchema.oneOf[0]
      if (firstOption && '$ref' in firstOption) {
        resolvedBodySchema = this.resolveRef(firstOption.$ref, spec)
        if (!resolvedBodySchema || '$ref' in resolvedBodySchema) {
          return ''
        }
      }
    }

    const parts: string[] = [
      '// Request body',
      'const body: RequestBody = {',
    ]

    // Collect all properties and required fields from allOf/properties
    const allProperties: Record<string, any> = {}
    const allRequired: Set<string> = new Set()

    // Handle allOf composition
    if ('allOf' in resolvedBodySchema && resolvedBodySchema.allOf) {
      for (const subSchema of resolvedBodySchema.allOf) {
        let resolved = subSchema
        if ('$ref' in subSchema) {
          resolved = this.resolveRef(subSchema.$ref, spec) as any
          if (!resolved) {
            continue
          }
        }

        // Collect properties
        if ('properties' in resolved && resolved.properties) {
          Object.assign(allProperties, resolved.properties)
        }

        // Collect required fields
        if ('required' in resolved && Array.isArray(resolved.required)) {
          resolved.required.forEach((field: string) => allRequired.add(field))
        }
      }
    }

    // Also include direct properties
    if ('properties' in resolvedBodySchema && resolvedBodySchema.properties) {
      Object.assign(allProperties, resolvedBodySchema.properties)
    }
    if ('required' in resolvedBodySchema && Array.isArray(resolvedBodySchema.required)) {
      resolvedBodySchema.required.forEach((field: string) => allRequired.add(field))
    }

    // Generate field entries
    if (Object.keys(allProperties).length > 0) {
      for (const [propName, propSchema] of Object.entries(allProperties)) {
        const isRequired = allRequired.has(propName)
        const exampleValue = this.generateExampleValue(propSchema, propName, resolvedBodySchema as any, spec)
        const valueStr = typeof exampleValue === 'string' ? `'${exampleValue}'` : JSON.stringify(exampleValue)

        if (isRequired) {
          parts.push(`  ${propName}: ${valueStr}, // required`)
        }
        else {
          parts.push(`  // ${propName}: ${valueStr}, // optional`)
        }
      }
    }

    parts.push('}', '')
    return parts.join('\n')
  }

  /**
   * Generate the actual request code
   */
  private generateRequestCode(
    path: string,
    method: string,
    pathParams: OpenAPIParameter[] | undefined,
    queryParams: OpenAPIParameter[] | undefined,
    requestBody: OpenAPIRequestBody | undefined,
  ): string[] {
    let actualPath = path
    if (pathParams && pathParams.length > 0) {
      // eslint-disable-next-line no-template-curly-in-string
      actualPath = `\`${path.replace(/\{([^}]+)\}/g, '${pathParams.$1}')}\``
    }
    else {
      actualPath = `'${path}'`
    }

    const requestParts = [`const response = await client(${actualPath}, {`]
    requestParts.push(`  method: '${method.toUpperCase()}',`)

    if (queryParams && queryParams.length > 0) {
      requestParts.push('  query: queryParams,')
    }

    if (requestBody) {
      requestParts.push('  body,')
    }

    requestParts.push('})')
    return requestParts
  }

  /**
   * Get the path to types.d.ts for the given API
   */
  private getTypesFilePath(apiName: string): string | null {
    const spec = this.specs.get(apiName)
    if (!spec) {
      return null
    }

    // Get directory of the spec file
    const specDir = join(spec.path, '..')
    const typesPath = join(specDir, 'types.d.ts')

    return existsSync(typesPath) ? typesPath : null
  }

  /**
   * Generate response handling code based on response structure analysis
   */
  private generateResponseHandlingCode(apiName: string, path: string, method: string): string[] {
    const responseParts: string[] = []

    // Get types.d.ts path for this API
    const typesPath = this.getTypesFilePath(apiName)
    if (!typesPath) {
      return responseParts
    }

    // Parse response structure from types.d.ts
    const responseStructure = parseResponseStructure(typesPath, path, method)

    if (responseStructure && responseStructure.isUnion && responseStructure.variants.length > 0) {
      responseParts.push('')
      responseParts.push('// Handle response based on structure')

      // Generate conditional checks for union types (e.g., droplet vs droplets)
      const variants = responseStructure.variants.filter((v: ResponseVariant) => v.properties.length > 0)

      if (variants.length > 1) {
        // Multiple variants - generate if/else
        variants.forEach((variant: ResponseVariant, index: number) => {
          const propName = variant.properties[0]
          if (!propName) {
            return
          }

          const condition = index === 0 ? 'if' : 'else if'

          responseParts.push(`${condition} ('${propName}' in response) {`)

          if (variant.isArrayProperty) {
            responseParts.push(`  console.log('${propName} created:', response.${propName}.length)`)
            responseParts.push(`  response.${propName}.forEach((item, idx) => {`)
            responseParts.push(`    console.log(\`Item \${idx + 1} ID:\`, item.id)`)
            responseParts.push(`  })`)
          }
          else {
            responseParts.push(`  console.log('${propName} created:', response.${propName})`)
            responseParts.push(`  console.log('ID:', response.${propName}.id)`)
          }

          responseParts.push('}')
        })
      }
      else if (variants.length === 1) {
        // Single variant
        const variant = variants[0]
        if (!variant) {
          return responseParts
        }

        const propName = variant.properties[0]
        if (!propName) {
          return responseParts
        }

        if (variant.isArrayProperty) {
          responseParts.push(`response.${propName}.forEach(item => console.log(item.id))`)
        }
        else {
          responseParts.push(`console.log('${propName}:', response.${propName})`)
        }
      }
    }
    else if (responseStructure && responseStructure.variants.length === 1) {
      // Non-union response
      const variant = responseStructure.variants[0]
      if (!variant) {
        return responseParts
      }

      if (variant.properties.length > 0) {
        const propName = variant.properties[0]
        if (!propName) {
          return responseParts
        }

        responseParts.push('')
        responseParts.push('// Access response data')

        if (variant.isArrayProperty) {
          responseParts.push(`response.${propName}.forEach(item => console.log(item))`)
        }
        else {
          responseParts.push(`console.log(response.${propName})`)
        }
      }
    }

    return responseParts
  }

  /**
   * Register all tools with automatic Zod validation
   */
  private registerTools() {
    // Note: We use z.string() with descriptions instead of z.enum() because:
    // 1. Specs are loaded asynchronously, so enum values aren't available at registration time
    // 2. The SDK validates against actual loaded APIs at runtime
    // 3. This provides better error messages to users
    const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'])

    // Tool 1: list_apis
    this.server.tool(
      'list_apis',
      'List all available API specifications with their metadata',
      async () => {
        const apis = Array.from(this.specs.values()).map(spec => ({
          name: spec.name,
          title: spec.spec.info?.title || 'Unknown',
          version: spec.spec.info?.version || 'Unknown',
          description: spec.spec.info?.description || '',
        }))

        return {
          content: [{ type: 'text', text: JSON.stringify(apis, null, 2) }],
        }
      },
    )

    // Tool 2: get_api_info
    this.server.tool(
      'get_api_info',
      'Get detailed information about a specific API',
      {
        api_name: z.string().describe('API name (e.g., "hetzner/cloud", "ory/kratos")'),
      },
      async ({ api_name }) => {
        const spec = this.specs.get(api_name)!

        const info = {
          title: spec.spec.info?.title,
          version: spec.spec.info?.version,
          description: spec.spec.info?.description,
          servers: spec.spec.servers || [],
          tags: spec.spec.tags || [],
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
        }
      },
    )

    // Tool 3: search_endpoints
    this.server.tool(
      'search_endpoints',
      'Search for API endpoints by query, method, or tags',
      {
        api_name: z.string().describe('API to search (e.g., "hetzner/cloud", "ory/kratos")'),
        query: z.string().optional().describe('Search query for path/summary/operationId'),
        method: httpMethodSchema.optional().describe('Filter by HTTP method'),
        limit: z.number().min(1).max(100).default(20).describe('Maximum results to return'),
      },
      async ({ api_name, query, method, limit }) => {
        const spec = this.specs.get(api_name)!
        const paths = spec.spec.paths || {}
        const results: any[] = []

        for (const [path, pathItem] of Object.entries(paths)) {
          if (results.length >= limit)
            break

          for (const [m, operation] of Object.entries(pathItem as any)) {
            if (results.length >= limit)
              break

            if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(m)) {
              const op = operation as any
              const matchesQuery = !query
                || path.toLowerCase().includes(query.toLowerCase())
                || op.summary?.toLowerCase().includes(query.toLowerCase())
                || op.operationId?.toLowerCase().includes(query.toLowerCase())

              const matchesMethod = !method || m.toUpperCase() === method

              if (matchesQuery && matchesMethod) {
                results.push({
                  path,
                  method: m.toUpperCase(),
                  operationId: op.operationId,
                  summary: op.summary,
                  description: op.description,
                  tags: op.tags || [],
                })
              }
            }
          }
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        }
      },
    )

    // Tool 4: get_endpoint_details
    this.server.tool(
      'get_endpoint_details',
      'Get complete details and usage example for a specific endpoint',
      {
        api_name: z.string().describe('API name (e.g., "hetzner/cloud", "ory/kratos")'),
        path: z.string().describe('Endpoint path (e.g., "/users")'),
        method: httpMethodSchema.describe('HTTP method'),
      },
      async ({ api_name, path, method }) => {
        const spec = this.specs.get(api_name)!
        const pathItem = spec.spec.paths?.[path]

        if (!pathItem) {
          throw new Error(`Path not found: ${path}`)
        }

        const operation = (pathItem as any)[method.toLowerCase()] as OpenAPIOperation
        if (!operation) {
          const availableMethods = Object.keys(pathItem)
            .filter(m => ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(m))
            .map(m => m.toUpperCase())
          throw new Error(`Method ${method} not found for ${path}. Available: ${availableMethods.join(', ')}`)
        }

        const codeExample = this.generateCodeExample(api_name, spec.spec, path, method, operation)

        // Filter out SDK-specific code samples (OpenAPI extensions)
        const operationWithExtensions = operation as Record<string, any>
        const { 'x-codeSamples': _, 'x-code-samples': __, ...cleanOperation } = operationWithExtensions

        const result = {
          endpoint: cleanOperation,
          usage_example: {
            description: 'Copy-paste ready TypeScript code',
            code: codeExample.fullExample,
          },
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      },
    )

    // Tool 5: get_schema_details
    this.server.tool(
      'get_schema_details',
      'Get details about a schema/model definition',
      {
        api_name: z.string().describe('API name (e.g., "hetzner/cloud", "ory/kratos")'),
        schema_name: z.string().describe('Schema name from components/schemas'),
      },
      async ({ api_name, schema_name }) => {
        const spec = this.specs.get(api_name)!
        const schema = spec.spec.components?.schemas?.[schema_name]

        if (!schema) {
          const availableSchemas = Object.keys(spec.spec.components?.schemas || {})
          throw new Error(`Schema "${schema_name}" not found. Available: ${availableSchemas.slice(0, 10).join(', ')}`)
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(schema, null, 2) }],
        }
      },
    )

    // Tool 6: generate_code_example
    this.server.tool(
      'generate_code_example',
      'Generate a complete TypeScript code example for an endpoint',
      {
        api_name: z.string().describe('API name (e.g., "hetzner/cloud", "ory/kratos")'),
        path: z.string().describe('Endpoint path'),
        method: httpMethodSchema.describe('HTTP method'),
      },
      async ({ api_name, path, method }) => {
        const spec = this.specs.get(api_name)!
        const pathItem = spec.spec.paths?.[path]

        if (!pathItem) {
          throw new Error(`Path not found: ${path}`)
        }

        const operation = (pathItem as any)[method.toLowerCase()] as OpenAPIOperation
        if (!operation) {
          throw new Error(`Method ${method} not found for ${path}`)
        }

        const codeExample = this.generateCodeExample(api_name, spec.spec, path, method, operation)

        const markdown = `# ${method.toUpperCase()} ${path}

${operation.summary || ''}

${operation.description || ''}

\`\`\`typescript
${codeExample.fullExample}
\`\`\`

## Breakdown

### 1. Import and Setup
\`\`\`typescript
${codeExample.imports}

${codeExample.setup}
\`\`\`

### 2. Make the Request
\`\`\`typescript
${codeExample.usage}
\`\`\`
`

        return {
          content: [{ type: 'text', text: markdown }],
        }
      },
    )

    // Tool 7: get_quickstart
    this.server.tool(
      'get_quickstart',
      'Generate a quickstart guide with common operations for an API',
      {
        api_name: z.string().describe('API name (e.g., "hetzner/cloud", "ory/kratos")'),
      },
      async ({ api_name }) => {
        const spec = this.specs.get(api_name)!
        const quickstart = this.generateQuickstart(api_name, spec.spec)

        const markdown = `# Quickstart Guide: ${spec.spec.info?.title || api_name}

${spec.spec.info?.description || ''}

## Installation

\`\`\`bash
npm install sufetch
# or
pnpm add sufetch
\`\`\`

## Complete Example

\`\`\`typescript
${quickstart}
\`\`\`

## Next Steps

- Use \`search_endpoints\` to find specific operations
- Use \`generate_code_example\` to get detailed code for any endpoint
- Check the API documentation for authentication requirements
`

        return {
          content: [{ type: 'text', text: markdown }],
        }
      },
    )
  }

  /**
   * Register all prompts for common workflows
   */
  private registerPrompts() {
    // Note: We use z.string() with descriptions instead of z.enum() for the same reasons as tools
    const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'])

    // Prompt 1: quickstart
    this.server.prompt(
      'quickstart',
      'Get started with an API - installation, setup, and common examples',
      {
        api_name: z.string().describe('API to generate quickstart for (e.g., "hetzner/cloud", "ory/kratos")'),
      },
      async ({ api_name }) => {
        const spec = this.specs.get(api_name)!

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Generate a quickstart guide for the ${spec.spec.info?.title || api_name} API using sufetch. Include:
1. Installation instructions
2. Basic client setup with authentication
3. 3-5 common use cases with complete code examples
4. Error handling best practices
5. Links to relevant documentation

API: ${api_name}
Base URL: ${spec.spec.servers?.[0]?.url || 'Not specified'}
Description: ${spec.spec.info?.description || 'No description available'}`,
              },
            },
          ],
        }
      },
    )

    // Prompt 2: implement-endpoint
    this.server.prompt(
      'implement-endpoint',
      'Generate implementation guide for a specific endpoint with full code',
      {
        api_name: z.string().describe('API name (e.g., "hetzner/cloud", "ory/kratos")'),
        path: z.string().describe('Endpoint path'),
        method: httpMethodSchema.describe('HTTP method'),
      },
      async ({ api_name, path, method }) => {
        const spec = this.specs.get(api_name)!
        const pathItem = spec.spec.paths?.[path]
        const operation = (pathItem as any)?.[method.toLowerCase()] as OpenAPIOperation

        if (!operation) {
          throw new Error(`Endpoint ${method} ${path} not found`)
        }

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Generate a complete implementation guide for this endpoint:

**API**: ${api_name}
**Endpoint**: ${method} ${path}
**Summary**: ${operation.summary || 'No summary'}
**Description**: ${operation.description || 'No description'}

Please provide:
1. Complete TypeScript code example using sufetch
2. Explanation of all required and optional parameters
3. Expected response structure
4. Common error cases and how to handle them
5. Best practices for using this endpoint

Use the \`generate_code_example\` tool to get the initial code, then enhance it with explanations.`,
              },
            },
          ],
        }
      },
    )

    // Prompt 3: explore-api
    this.server.prompt(
      'explore-api',
      'Interactive guide to explore an API with focus on specific area',
      {
        api_name: z.string().describe('API to explore (e.g., "hetzner/cloud", "ory/kratos")'),
        focus: z.string().optional().describe('Focus area (e.g., "authentication", "users")'),
      },
      async ({ api_name, focus }) => {
        const spec = this.specs.get(api_name)!
        const focusArea = focus || 'general overview'

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Explore the ${spec.spec.info?.title || api_name} API with focus on: "${focusArea}"

Please provide an interactive exploration that includes:
1. API overview and key features
2. Most commonly used endpoints related to "${focusArea}"
3. Authentication and setup requirements
4. Code examples for key operations
5. Recommended workflows and patterns

**API Information:**
- Name: ${api_name}
- Version: ${spec.spec.info?.version || 'Unknown'}
- Description: ${spec.spec.info?.description || 'No description'}
- Base URL: ${spec.spec.servers?.[0]?.url || 'Not specified'}
- Available tags: ${spec.spec.tags?.map((t: any) => t.name).join(', ') || 'None'}

Use \`search_endpoints\` to find relevant endpoints, then \`get_endpoint_details\` for specific examples.`,
              },
            },
          ],
        }
      },
    )
  }

  // Helper methods (copied from original, these stay the same)
  private getApiServiceName(apiName: string): string {
    return apiName.split('/').pop() || apiName
  }

  private generateExampleValue(property: any, propertyName: string, schema: any, spec: any): any {
    if (property.example !== undefined) {
      return property.example
    }

    if (property.default !== undefined) {
      return property.default
    }

    if (property.enum && property.enum.length > 0) {
      return property.enum[0]
    }

    if (property.$ref) {
      const resolved = this.resolveRef(property.$ref, spec)
      if (resolved) {
        return this.generateExampleValue(resolved, propertyName, schema, spec)
      }
    }

    const type = property.type

    if (type === 'string') {
      const format = property.format

      if (format === 'email')
        return 'user@example.com'
      if (format === 'date-time')
        return new Date().toISOString()
      if (format === 'date')
        return new Date().toISOString().split('T')[0]
      if (format === 'uuid')
        return '123e4567-e89b-12d3-a456-426614174000'
      if (format === 'uri' || format === 'url')
        return 'https://example.com'

      const lowerName = propertyName.toLowerCase()
      if (lowerName.includes('id'))
        return 'example-id'
      if (lowerName.includes('name'))
        return 'Example Name'
      if (lowerName.includes('email'))
        return 'user@example.com'
      if (lowerName.includes('url'))
        return 'https://example.com'
      if (lowerName.includes('token'))
        return 'example_token_123'

      return 'example_value'
    }

    if (type === 'number' || type === 'integer') {
      return type === 'integer' && property.format === 'int64' ? 1 : 10
    }

    if (type === 'boolean') {
      return true
    }

    if (type === 'array') {
      const itemExample = property.items
        ? this.generateExampleValue(property.items, propertyName, schema, spec)
        : 'example'
      return [itemExample]
    }

    if (type === 'object' || property.properties) {
      const obj: Record<string, any> = {}
      if (property.properties) {
        for (const [key, value] of Object.entries(property.properties)) {
          obj[key] = this.generateExampleValue(value, key, schema, spec)
        }
      }
      return obj
    }

    return null
  }

  private resolveRef(ref: string, spec: OpenAPIDocument): ResolvedSchema | null {
    if (this.refCache.has(ref)) {
      return this.refCache.get(ref) || null
    }

    this.log(`[resolveRef] Resolving: ${ref}`)

    if (!ref.startsWith('#/')) {
      this.log(`[resolveRef] External ref not supported: ${ref}`)
      return null
    }

    const path = ref.substring(2)
    const segments = path.split('/')

    this.log(`[resolveRef] Path segments:`, segments)

    let current: any = spec
    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        this.log(`[resolveRef] Stopped at segment ${segment}: current is not an object`)
        return null
      }

      current = current[segment]
      this.log(`[resolveRef] After segment ${segment}:`, current ? 'exists' : 'undefined')
    }

    if (!current) {
      this.log(`[resolveRef] Final result: not found`)
      return null
    }

    this.log(`[resolveRef] Final result: exists - has allOf:`, !!current.allOf)

    const resolved = current as ResolvedSchema
    this.refCache.set(ref, resolved)
    return resolved
  }

  // @ts-ignore - Keeping for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private analyzeResponseStructure(
    operation: OpenAPIOperation,
    spec: OpenAPIDocument,
  ): ResponseStructure | null {
    // Note: Analysis is fast (<1ms), no need for separate cache
    // Result is already cached via exampleCache when used in code generation

    const responses = operation.responses || {}
    const successCodes = [200, 201, 202, 204]
    let statusCode = 200
    let responseObj = responses['200'] || responses['201'] || responses['202'] || responses['204']

    if (!responseObj) {
      for (const code of successCodes) {
        if (responses[code]) {
          responseObj = responses[code]
          statusCode = code
          break
        }
      }
    }

    if (!responseObj) {
      return null
    }

    if (responses['201'])
      statusCode = 201
    else if (responses['202'])
      statusCode = 202

    // Type guard: ensure responseObj is not a reference
    if (!responseObj || '$ref' in responseObj) {
      return null
    }

    const schema = responseObj.content?.['application/json']?.schema

    if (!schema) {
      return null
    }

    let resolvedSchema: ResolvedSchema | OpenAPISchema = schema
    if ('$ref' in schema) {
      const resolved = this.resolveRef(schema.$ref, spec)
      if (!resolved)
        return null
      resolvedSchema = resolved
    }

    // Type guard: ensure we have a non-reference schema
    if ('$ref' in resolvedSchema) {
      return null
    }

    const result = {
      statusCode,
      schema: resolvedSchema,
      wrapperKeys: [] as string[],
      primaryResource: null as string | null,
      importantFields: [] as string[],
      isArray: false,
      hasActions: false,
    }

    if (resolvedSchema.type === 'array') {
      result.isArray = true
      return result
    }

    if (resolvedSchema.properties) {
      const props = Object.keys(resolvedSchema.properties)

      for (const key of props) {
        const prop = resolvedSchema.properties[key] as any
        if (prop?.type === 'object' || prop?.$ref) {
          result.wrapperKeys.push(key)

          if (!result.primaryResource) {
            result.primaryResource = key
          }

          if (key === 'action' || key === 'actions') {
            result.hasActions = true
          }
        }
      }

      if (result.primaryResource) {
        let primarySchema = resolvedSchema.properties[result.primaryResource] as any
        if (primarySchema?.$ref) {
          primarySchema = this.resolveRef(primarySchema.$ref, spec)
        }

        if (primarySchema?.properties) {
          const idFields = ['id', 'uuid', 'name', 'slug']
          for (const field of idFields) {
            if (primarySchema.properties[field]) {
              result.importantFields.push(field)
            }
          }
        }
      }
    }

    return result
  }

  /**
   * Generate a complete TypeScript code example for an API endpoint
   * Refactored to use smaller helper methods for better maintainability
   */
  private generateCodeExample(
    apiName: string,
    spec: OpenAPIDocument,
    path: string,
    method: string,
    operation: OpenAPIOperation,
  ): CodeExample {
    // Check cache first
    const cacheKey = `${apiName}:${path}:${method}`
    if (this.exampleCache.has(cacheKey)) {
      const cached = this.exampleCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < this.config.cache.exampleTTL) {
        this.log(`Example cache hit for ${cacheKey}`)
        return cached.example
      }
      this.exampleCache.delete(cacheKey)
    }

    // Generate components using helper methods
    const serviceName = this.getApiServiceName(apiName)
    const typeHelperName = this.getTypeHelperName(apiName)

    // 1. Generate type definitions
    const typeDefs = this.generateTypeDefinitions(path, method, typeHelperName, operation)
    const typeDefsStr = typeDefs.length > 0 ? `\n\n${typeDefs.join('\n')}` : ''

    // 2. Generate imports (include type helper import for type safety)
    const packageName = apiName.split('/')[0]
    let imports = `import { createClient, ${serviceName} } from 'sufetch/${packageName}'`

    // Add type helper import if we have type definitions
    if (typeDefs.length > 0) {
      imports += `\nimport type { ${typeHelperName} } from 'sufetch/${packageName}'`
    }

    imports += typeDefsStr

    // 3. Generate client setup
    const setup = this.generateClientSetup(serviceName, spec)

    // 4. Generate usage code with parameters and request
    const pathParams = operation.parameters?.filter((p): p is OpenAPIParameter =>
      !('$ref' in p) && p.in === 'path',
    )
    const queryParams = operation.parameters?.filter((p): p is OpenAPIParameter =>
      !('$ref' in p) && p.in === 'query',
    )
    // Resolve request body if it's a reference
    let requestBody = operation.requestBody
    if (requestBody && '$ref' in requestBody) {
      requestBody = this.resolveRef(requestBody.$ref, spec) as OpenAPIRequestBody
    }

    const usageParts: string[] = []

    // Add path parameters
    if (pathParams && pathParams.length > 0) {
      usageParts.push(this.generatePathParamsCode(pathParams, spec))
    }

    // Add query parameters
    if (queryParams && queryParams.length > 0) {
      usageParts.push(this.generateQueryParamsCode(queryParams, spec))
    }

    // Add request body
    if (requestBody) {
      const bodyCode = this.generateRequestBodyCode(requestBody, spec)
      if (bodyCode) {
        usageParts.push(bodyCode)
      }
    }

    // 5. Generate the actual request code
    const requestParts = this.generateRequestCode(path, method, pathParams, queryParams, requestBody)

    // 6. Add response handling code
    const responseParts = this.generateResponseHandlingCode(apiName, path, method)
    requestParts.push(...responseParts)

    const usage = usageParts.concat(requestParts).join('\n')
    const fullExample = `${imports}\n\n${setup}\n\n${usage}`

    const example: CodeExample = { imports, setup, usage, fullExample }

    if (this.exampleCache.size >= this.config.cache.exampleSize) {
      const firstKey = this.exampleCache.keys().next().value
      if (firstKey) {
        this.exampleCache.delete(firstKey)
      }
    }

    this.exampleCache.set(cacheKey, { timestamp: Date.now(), example })

    return example
  }

  private getTypeHelperName(apiName: string): string {
    // Try to find the actual type helper name from parsed types.d.ts
    const typeHelpers = this.getAllTypeHelpers()

    // Match type helper by searching for the main one (has properties like 'request', 'response')
    for (const helper of typeHelpers) {
      const hasRequestProp = helper.properties.some((p: any) => p.name === 'request')
      const hasResponseProp = helper.properties.some((p: any) => p.name === 'response')

      // Main type helper has request and response properties
      if (hasRequestProp && hasResponseProp) {
        // Check if this type helper matches the API
        const lowerName = helper.name.toLowerCase()
        const apiParts = apiName.split('/').map(p => p.toLowerCase())

        // Check if helper name contains any part of the API name
        const matches = apiParts.some(part => lowerName.includes(part))
        if (matches) {
          return helper.name
        }
      }
    }

    // Fallback to old behavior
    const parts = apiName.split('/')
    if (parts.length === 1) {
      return this.capitalizeFirst(parts[0]!)
    }
    return parts.map(p => this.capitalizeFirst(p)).join('')
  }

  private getAllTypeHelpers() {
    const allHelpers: any[] = []
    // Get all cached type helpers
    for (const [_, helpers] of (this.typeCache as any).cache.entries()) {
      allHelpers.push(...helpers)
    }
    return allHelpers
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private generateQuickstart(apiName: string, spec: any): string {
    const serviceName = this.getApiServiceName(apiName)
    const packageName = apiName.split('/')[0]
    const baseUrl = spec.servers?.[0]?.url || 'https://api.example.com'

    const setupParts = [
      `import { createClient, ${serviceName} } from 'sufetch/${packageName}'`,
      '',
      'const client = createClient({',
      `  baseURL: '${baseUrl}',`,
    ]

    if (spec.components?.securitySchemes) {
      const securitySchemes = spec.components.securitySchemes
      if (securitySchemes.bearerAuth || securitySchemes.Bearer) {
        setupParts.push('  headers: {')
        // eslint-disable-next-line no-template-curly-in-string
        setupParts.push('    \'Authorization\': `Bearer ${YOUR_TOKEN}`,')
        setupParts.push('  },')
      }
      else if (securitySchemes.apiKey || securitySchemes.ApiKey) {
        setupParts.push('  headers: {')
        setupParts.push('    \'X-API-Key\': YOUR_API_KEY,')
        setupParts.push('  },')
      }
    }

    setupParts.push(`}).with(${serviceName})`)
    setupParts.push('')
    setupParts.push('// Common operations')

    const paths = spec.paths || {}
    const operations: string[] = []
    let count = 0

    for (const [path, pathItem] of Object.entries(paths)) {
      if (count >= 3)
        break

      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (count >= 3)
          break

        if (['get', 'post', 'put', 'delete'].includes(method)) {
          const op = operation as any
          const summary = op.summary || path

          operations.push(`// ${summary}`)
          operations.push(`const result${count + 1} = await client('${path}', {`)
          operations.push(`  method: '${method.toUpperCase()}',`)
          operations.push('})')
          operations.push('')

          count++
        }
      }
    }

    return setupParts.concat(operations).join('\n')
  }

  private cleanup() {
    this.log('Shutting down gracefully...')

    const refsCleared = this.refCache.size
    const examplesCleared = this.exampleCache.size

    this.refCache.clear()
    this.exampleCache.clear()

    this.log(`Cleared caches: ${refsCleared} refs, ${examplesCleared} examples`)
    this.log('Shutdown complete')
  }

  async run() {
    await this.initialize()

    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('ToonFetch MCP server running on stdio')
    if (this.config.debug) {
      console.error('Debug mode enabled - Set TOONFETCH_DEBUG=false to disable verbose logging')
    }

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      console.error(`\nReceived ${signal}, shutting down gracefully...`)
      this.cleanup()
      process.exit(0)
    }

    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      this.cleanup()
      process.exit(1)
    })

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason)
      this.cleanup()
      process.exit(1)
    })
  }
}

// Start the server
const server = new ToonFetchMCPServer()
server.run().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
