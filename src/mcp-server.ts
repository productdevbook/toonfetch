#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { decode } from '@toon-format/toon'

interface ApiSpec {
  name: string
  path: string
  spec: any
}

interface CodeExample {
  imports: string
  setup: string
  usage: string
  fullExample: string
}

class ToonFetchMCPServer {
  private server: Server
  private specs: Map<string, ApiSpec> = new Map()
  private specsDir: string

  constructor() {
    this.server = new Server(
      {
        name: 'toonfetch-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    )

    // Get the directory where this script is located
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    // Go up one level from dist to reach project root
    const projectRoot = resolve(__dirname, '..')
    this.specsDir = resolve(projectRoot, 'openapi-specs')

    console.error(`Looking for specs in: ${this.specsDir}`)
    this.loadSpecs()
    this.setupHandlers()
  }

  private loadSpecs() {
    try {
      // Scan openapi-specs directory for .toon files
      const scanDir = (dir: string, prefix = '') => {
        const entries = readdirSync(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = join(dir, entry.name)

          if (entry.isDirectory()) {
            scanDir(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name)
          }
          else if (entry.name.endsWith('.toon')) {
            const name = entry.name.replace('.toon', '')
            const key = prefix ? `${prefix}/${name}` : name

            try {
              const toonContent = readFileSync(fullPath, 'utf-8')
              const spec = decode(toonContent)

              this.specs.set(key, {
                name: key,
                path: fullPath,
                spec,
              })
            }
            catch (error) {
              console.error(`Failed to load ${fullPath}:`, error)
            }
          }
        }
      }

      scanDir(this.specsDir)
      console.error(`Loaded ${this.specs.size} API specs`)
    }
    catch (error) {
      console.error('Failed to load specs:', error)
    }
  }

  private getApiServiceName(apiName: string): string {
    // Convert "ory/kratos" to "kratos", "ory/hydra" to "hydra"
    return apiName.split('/').pop() || apiName
  }

  private generateExampleValue(schema: any, propertyName?: string): any {
    if (!schema)
      return undefined

    // If there's an example, use it
    if (schema.example !== undefined)
      return schema.example

    // Handle references
    if (schema.$ref)
      return `/* Reference to ${schema.$ref} */`

    // Handle arrays
    if (schema.type === 'array') {
      return [this.generateExampleValue(schema.items)]
    }

    // Handle objects
    if (schema.type === 'object') {
      const example: any = {}
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          example[key] = this.generateExampleValue(prop as any, key)
        }
      }
      return example
    }

    // Handle primitive types
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

  private generateCodeExample(apiName: string, path: string, method: string, operation: any): CodeExample {
    const serviceName = this.getApiServiceName(apiName)
    const methodUpper = method.toUpperCase()

    // Generate imports
    const imports = `import { createClient, ${serviceName} } from 'toonfetch/${apiName.split('/')[0]}'`

    // Generate client setup
    const baseUrlExample = apiName.includes('kratos')
      ? 'https://your-kratos-instance.com'
      : apiName.includes('hydra')
        ? 'https://your-hydra-instance.com'
        : 'https://api.example.com'

    const setup = `const client = createClient({
  baseURL: '${baseUrlExample}',
}).with(${serviceName})`

    // Extract parameters
    const pathParams: any = {}
    const queryParams: any = {}
    let requestBody: any

    // Process parameters
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === 'path') {
          pathParams[param.name] = this.generateExampleValue(param.schema, param.name)
        }
        else if (param.in === 'query') {
          queryParams[param.name] = this.generateExampleValue(param.schema, param.name)
        }
      }
    }

    // Process request body
    if (operation.requestBody) {
      const content = operation.requestBody.content
      const jsonContent = content?.['application/json']
      if (jsonContent?.schema) {
        requestBody = this.generateExampleValue(jsonContent.schema)
      }
    }

    // Build the request options object
    const options: string[] = [`  method: '${methodUpper}'`]

    if (Object.keys(pathParams).length > 0) {
      options.push(`  path: ${JSON.stringify(pathParams, null, 2).split('\n').join('\n  ')}`)
    }

    if (Object.keys(queryParams).length > 0) {
      options.push(`  query: ${JSON.stringify(queryParams, null, 2).split('\n').join('\n  ')}`)
    }

    if (requestBody !== undefined) {
      options.push(`  body: ${JSON.stringify(requestBody, null, 2).split('\n').join('\n  ')}`)
    }

    // Generate usage
    const usage = `const response = await client('${path}', {
${options.join(',\n')}
})`

    // Generate full example
    const fullExample = `${imports}

// Initialize the client
${setup}

// Make the request
async function ${operation.operationId || 'makeRequest'}() {
  ${usage}

  console.log('Response:', response)
  return response
}

// Call the function
${operation.operationId || 'makeRequest'}().catch(console.error)`

    return {
      imports,
      setup,
      usage,
      fullExample,
    }
  }

  private generateQuickstart(apiName: string, spec: any): string {
    const serviceName = this.getApiServiceName(apiName)
    const baseUrlExample = apiName.includes('kratos')
      ? 'https://your-kratos-instance.com'
      : apiName.includes('hydra')
        ? 'https://your-hydra-instance.com'
        : 'https://api.example.com'

    // Find a few common operations
    const paths = spec.paths || {}
    const operations: Array<{ path: string, method: string, operation: any }> = []

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post'].includes(method) && operations.length < 3) {
          operations.push({ path, method, operation })
        }
      }
    }

    let examples = ''
    for (const { path, method, operation } of operations) {
      const example = this.generateCodeExample(apiName, path, method, operation)
      examples += `\n// ${operation.summary || operation.operationId || 'Example'}\n${example.usage}\n`
    }

    return `import { createClient, ${serviceName} } from 'toonfetch/${apiName.split('/')[0]}'

// Initialize the ${spec.info?.title || serviceName} client
const client = createClient({
  baseURL: '${baseUrlExample}',
}).with(${serviceName})

// Common operations:
${examples}
`
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_apis',
          description: 'List all available API specifications',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_api_info',
          description: 'Get high-level information about an API (title, version, description, servers)',
          inputSchema: {
            type: 'object',
            properties: {
              api_name: {
                type: 'string',
                description: 'API name (e.g., "ory/hydra", "ory/kratos")',
              },
            },
            required: ['api_name'],
          },
        },
        {
          name: 'search_endpoints',
          description: 'Search for API endpoints by path or method',
          inputSchema: {
            type: 'object',
            properties: {
              api_name: {
                type: 'string',
                description: 'API name (e.g., "ory/hydra", "ory/kratos")',
              },
              query: {
                type: 'string',
                description: 'Search query (searches in path and summary)',
              },
              method: {
                type: 'string',
                description: 'Filter by HTTP method (GET, POST, PUT, DELETE, etc.)',
              },
            },
            required: ['api_name'],
          },
        },
        {
          name: 'get_endpoint_details',
          description: 'Get detailed information about a specific endpoint',
          inputSchema: {
            type: 'object',
            properties: {
              api_name: {
                type: 'string',
                description: 'API name (e.g., "ory/hydra", "ory/kratos")',
              },
              path: {
                type: 'string',
                description: 'Endpoint path (e.g., "/admin/oauth2/clients")',
              },
              method: {
                type: 'string',
                description: 'HTTP method (e.g., "get", "post")',
              },
            },
            required: ['api_name', 'path', 'method'],
          },
        },
        {
          name: 'get_schema_details',
          description: 'Get details about a specific schema/model definition',
          inputSchema: {
            type: 'object',
            properties: {
              api_name: {
                type: 'string',
                description: 'API name (e.g., "ory/hydra", "ory/kratos")',
              },
              schema_name: {
                type: 'string',
                description: 'Schema name from components/schemas',
              },
            },
            required: ['api_name', 'schema_name'],
          },
        },
        {
          name: 'generate_code_example',
          description: 'Generate a complete TypeScript code example for using an endpoint with toonfetch library',
          inputSchema: {
            type: 'object',
            properties: {
              api_name: {
                type: 'string',
                description: 'API name (e.g., "ory/hydra", "ory/kratos")',
              },
              path: {
                type: 'string',
                description: 'Endpoint path (e.g., "/admin/oauth2/clients")',
              },
              method: {
                type: 'string',
                description: 'HTTP method (e.g., "get", "post")',
              },
            },
            required: ['api_name', 'path', 'method'],
          },
        },
        {
          name: 'get_quickstart',
          description: 'Get a quickstart guide with common operations for an API using toonfetch',
          inputSchema: {
            type: 'object',
            properties: {
              api_name: {
                type: 'string',
                description: 'API name (e.g., "ory/hydra", "ory/kratos")',
              },
            },
            required: ['api_name'],
          },
        },
      ],
    }))

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'list_apis':
            return this.handleListApis()
          case 'get_api_info':
            return this.handleGetApiInfo(args)
          case 'search_endpoints':
            return this.handleSearchEndpoints(args)
          case 'get_endpoint_details':
            return this.handleGetEndpointDetails(args)
          case 'get_schema_details':
            return this.handleGetSchemaDetails(args)
          case 'generate_code_example':
            return this.handleGenerateCodeExample(args)
          case 'get_quickstart':
            return this.handleGetQuickstart(args)
          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      }
      catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        }
      }
    })
  }

  private handleListApis() {
    const apis = Array.from(this.specs.values()).map(spec => ({
      name: spec.name,
      title: spec.spec.info?.title || 'Unknown',
      version: spec.spec.info?.version || 'Unknown',
      description: spec.spec.info?.description || '',
    }))

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(apis, null, 2),
        },
      ],
    }
  }

  private handleGetApiInfo(args: any) {
    const spec = this.specs.get(args.api_name)
    if (!spec) {
      throw new Error(`API not found: ${args.api_name}`)
    }

    const info = {
      title: spec.spec.info?.title,
      version: spec.spec.info?.version,
      description: spec.spec.info?.description,
      servers: spec.spec.servers || [],
      tags: spec.spec.tags || [],
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2),
        },
      ],
    }
  }

  private handleSearchEndpoints(args: any) {
    const spec = this.specs.get(args.api_name)
    if (!spec) {
      throw new Error(`API not found: ${args.api_name}`)
    }

    const paths = spec.spec.paths || {}
    const results: any[] = []

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          const op = operation as any
          const matchesQuery = !args.query
            || path.toLowerCase().includes(args.query.toLowerCase())
            || op.summary?.toLowerCase().includes(args.query.toLowerCase())
            || op.operationId?.toLowerCase().includes(args.query.toLowerCase())

          const matchesMethod = !args.method
            || method.toLowerCase() === args.method.toLowerCase()

          if (matchesQuery && matchesMethod) {
            results.push({
              path,
              method: method.toUpperCase(),
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
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    }
  }

  private handleGetEndpointDetails(args: any) {
    const spec = this.specs.get(args.api_name)
    if (!spec) {
      throw new Error(`API not found: ${args.api_name}`)
    }

    const pathItem = spec.spec.paths?.[args.path]
    if (!pathItem) {
      throw new Error(`Path not found: ${args.path}`)
    }

    const operation = pathItem[args.method.toLowerCase()]
    if (!operation) {
      throw new Error(`Method not found: ${args.method} for path ${args.path}`)
    }

    // Generate code example
    const codeExample = this.generateCodeExample(args.api_name, args.path, args.method, operation)

    const result = {
      endpoint: operation,
      usage_example: {
        description: 'Copy-paste ready code example using toonfetch library',
        code: codeExample.fullExample,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  private handleGetSchemaDetails(args: any) {
    const spec = this.specs.get(args.api_name)
    if (!spec) {
      throw new Error(`API not found: ${args.api_name}`)
    }

    const schema = spec.spec.components?.schemas?.[args.schema_name]
    if (!schema) {
      throw new Error(`Schema not found: ${args.schema_name}`)
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(schema, null, 2),
        },
      ],
    }
  }

  private handleGenerateCodeExample(args: any) {
    const spec = this.specs.get(args.api_name)
    if (!spec) {
      throw new Error(`API not found: ${args.api_name}`)
    }

    const pathItem = spec.spec.paths?.[args.path]
    if (!pathItem) {
      throw new Error(`Path not found: ${args.path}`)
    }

    const operation = pathItem[args.method.toLowerCase()]
    if (!operation) {
      throw new Error(`Method not found: ${args.method} for path ${args.path}`)
    }

    const codeExample = this.generateCodeExample(args.api_name, args.path, args.method, operation)

    return {
      content: [
        {
          type: 'text',
          text: `# Code Example for ${args.method.toUpperCase()} ${args.path}

## ${operation.summary || operation.operationId || 'Endpoint Usage'}

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
`,
        },
      ],
    }
  }

  private handleGetQuickstart(args: any) {
    const spec = this.specs.get(args.api_name)
    if (!spec) {
      throw new Error(`API not found: ${args.api_name}`)
    }

    const quickstart = this.generateQuickstart(args.api_name, spec.spec)

    return {
      content: [
        {
          type: 'text',
          text: `# Quickstart Guide: ${spec.spec.info?.title || args.api_name}

${spec.spec.info?.description || ''}

## Installation

\`\`\`bash
npm install toonfetch
# or
pnpm add toonfetch
\`\`\`

## Complete Example

\`\`\`typescript
${quickstart}
\`\`\`

## Next Steps

- Use \`search_endpoints\` to find specific operations
- Use \`generate_code_example\` to get detailed code for any endpoint
- Check the API documentation for authentication requirements
`,
        },
      ],
    }
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('ToonFetch MCP server running on stdio')
  }
}

// Start the server
const server = new ToonFetchMCPServer()
server.run().catch(console.error)
