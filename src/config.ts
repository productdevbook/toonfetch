/**
 * Configuration for ToonFetch MCP Server
 *
 * All settings can be overridden via environment variables for flexibility
 * in different deployment environments (development, production, testing).
 */

/* eslint-disable node/prefer-global/process */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface ServerConfig {
  /** Enable debug logging */
  debug: boolean

  /** Cache configuration */
  cache: {
    /** Maximum number of code examples to cache */
    exampleSize: number
    /** Time-to-live for cached examples in milliseconds (5 minutes default) */
    exampleTTL: number
  }

  /** File system paths */
  paths: {
    /** Directory containing OpenAPI specs in TOON format */
    specsDir: string
  }

  /** Server metadata */
  server: {
    /** Server name for MCP protocol */
    name: string
    /** Server version */
    version: string
  }

  /** HTTP configuration */
  http: {
    /** Valid HTTP methods for API operations */
    methods: readonly string[]
    /** HTTP status codes considered successful */
    successCodes: readonly number[]
  }

  /** Schema analysis configuration */
  schemas: {
    /** Field names that typically contain unique identifiers */
    identifierFields: readonly string[]
    /** Field names that typically contain important data */
    importantFieldPatterns: readonly string[]
  }

  /** Example value generation */
  exampleValues: {
    /** Default email for examples */
    defaultEmail: string
    /** Default URL for examples */
    defaultUrl: string
    /** Default number value */
    defaultNumber: number
    /** Default integer value */
    defaultInteger: number
    /** Default boolean value */
    defaultBoolean: boolean
    /** Function to generate current timestamp */
    getCurrentTimestamp: () => string
  }
}

/**
 * Load configuration from environment variables with sensible defaults
 */
export function loadConfig(): ServerConfig {
  // Determine project root directory
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const projectRoot = resolve(__dirname, '..')

  return {
    debug: process.env.TOONFETCH_DEBUG === 'true',

    cache: {
      exampleSize: Number.parseInt(process.env.TOONFETCH_CACHE_SIZE || '100', 10),
      exampleTTL: Number.parseInt(process.env.TOONFETCH_CACHE_TTL || String(5 * 60 * 1000), 10),
    },

    paths: {
      specsDir: process.env.TOONFETCH_SPECS_DIR || resolve(projectRoot, 'openapi-specs'),
    },

    server: {
      name: 'sufetch-mcp',
      version: '0.3.0',
    },

    http: {
      methods: ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const,
      successCodes: [200, 201, 202, 204] as const,
    },

    schemas: {
      identifierFields: ['id', 'uuid', 'name', 'slug'] as const,
      importantFieldPatterns: [
        'name',
        'title',
        'description',
        'summary',
        'status',
        'state',
        'type',
        'kind',
        'created',
        'updated',
        'deleted',
        'url',
        'uri',
        'href',
        'link',
      ] as const,
    },

    exampleValues: {
      defaultEmail: 'user@example.com',
      defaultUrl: 'https://example.com',
      defaultNumber: 10,
      defaultInteger: 1,
      defaultBoolean: true,
      getCurrentTimestamp: () => new Date().toISOString(),
    },
  }
}

/**
 * Default configuration instance
 * Use loadConfig() for custom configuration or testing
 */
export const DEFAULT_CONFIG: ServerConfig = loadConfig()
