/**
 * Type-based code generator using types.d.ts
 *
 * Instead of parsing OpenAPI specs, we directly use the generated types.d.ts
 * which already has all the correct type information.
 */

import type { TypeHelperInfo, TypeInfoCache } from './type-parser.js'

export interface GeneratedCode {
  imports: string
  typeDefinitions: string
  setupCode: string
  usageCode: string
}

export class TypeBasedGenerator {
  typeCache: TypeInfoCache

  constructor(typeCache: TypeInfoCache) {
    this.typeCache = typeCache
  }

  /**
   * Generate code for an endpoint using types.d.ts
   */
  generateCode(
    apiName: string,
    path: string,
    method: string,
  ): GeneratedCode | null {
    // Find the type helper for this API
    const typeHelper = this.findTypeHelper(apiName)
    if (!typeHelper) {
      return null
    }

    const packageName = apiName.split('/')[0]!
    const serviceName = this.getServiceName(apiName)
    const lowerMethod = method.toLowerCase()

    // Generate imports
    const imports = [
      `import { createClient, ${serviceName} } from 'toonfetch/${packageName}'`,
      `import type { ${typeHelper.name} } from 'toonfetch/${packageName}'`,
    ].join('\n')

    // Generate type definitions
    const typeDefs: string[] = []

    // Check which properties exist for this endpoint type
    const hasRequest = typeHelper.properties.some(p => p.name === 'request')
    const hasPath = typeHelper.properties.some(p => p.name === 'path')
    const hasQuery = typeHelper.properties.some(p => p.name === 'query')

    if (hasRequest) {
      const requestProp = typeHelper.properties.find(p => p.name === 'request')
      if (requestProp?.description) {
        typeDefs.push(`/** ${requestProp.description} */`)
      }
      typeDefs.push(`type RequestBody = ${typeHelper.name}<'${path}', '${lowerMethod}'>['request']`)
    }

    if (hasPath) {
      const pathProp = typeHelper.properties.find(p => p.name === 'path')
      if (pathProp?.description) {
        typeDefs.push(`/** ${pathProp.description} */`)
      }
      typeDefs.push(`type PathParams = ${typeHelper.name}<'${path}', '${lowerMethod}'>['path']`)
    }

    if (hasQuery) {
      const queryProp = typeHelper.properties.find(p => p.name === 'query')
      if (queryProp?.description) {
        typeDefs.push(`/** ${queryProp.description} */`)
      }
      typeDefs.push(`type QueryParams = ${typeHelper.name}<'${path}', '${lowerMethod}'>['query']`)
    }

    const typeDefinitions = typeDefs.join('\n\n')

    // Generate setup code
    const setupCode = [
      'const client = createClient({',
      `  baseURL: 'https://api.example.com', // Replace with actual base URL`,
      `}).with(${serviceName})`,
    ].join('\n')

    // Generate usage code
    const usageParts: string[] = []

    if (hasRequest) {
      usageParts.push('// Create request body')
      usageParts.push('const body: RequestBody = {')
      usageParts.push('  // TODO: Add required fields')
      usageParts.push('}')
      usageParts.push('')
    }

    usageParts.push(`const response = await client('${path}', {`)
    usageParts.push(`  method: '${method.toUpperCase()}',`)

    if (hasQuery) {
      usageParts.push('  // query: queryParams,')
    }

    if (hasRequest) {
      usageParts.push('  body,')
    }

    usageParts.push('})')

    const usageCode = usageParts.join('\n')

    return {
      imports,
      typeDefinitions,
      setupCode,
      usageCode,
    }
  }

  private findTypeHelper(apiName: string): TypeHelperInfo | null {
    // Get all type helpers from cache
    const allHelpers = this.getAllTypeHelpers()

    // Find the main type helper (has request/response properties)
    for (const helper of allHelpers) {
      const hasRequest = helper.properties.some(p => p.name === 'request')
      const hasResponse = helper.properties.some(p => p.name === 'response')

      if (hasRequest && hasResponse) {
        // Check if this matches the API name
        const lowerName = helper.name.toLowerCase()
        const apiParts = apiName.split('/').map(p => p.toLowerCase())

        if (apiParts.some(part => lowerName.includes(part))) {
          return helper
        }
      }
    }

    return null
  }

  private getAllTypeHelpers(): TypeHelperInfo[] {
    const allHelpers: TypeHelperInfo[] = []
    for (const helpers of (this.typeCache as any).cache.values()) {
      allHelpers.push(...helpers)
    }
    return allHelpers
  }

  private getServiceName(apiName: string): string {
    const parts = apiName.split('/')
    return parts[parts.length - 1] || 'api'
  }
}
