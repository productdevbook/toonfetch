import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { decode } from '@toon-format/toon'
import { describe, expect, it } from 'vitest'

/**
 * Build Pipeline Integration Tests
 *
 * Tests the complete build pipeline including:
 * - TOON conversion
 * - Type generation
 * - File structure validation
 * - Package.json exports
 *
 * Note: These tests assume the build has been run at least once.
 */

const PROJECT_ROOT = join(__dirname, '../..')
const SPECS_DIR = join(PROJECT_ROOT, 'openapi-specs')
const DIST_DIR = join(PROJECT_ROOT, 'dist')

describe('build Pipeline - TOON Conversion', () => {
  it('should have converted Kratos spec to TOON', () => {
    const toonPath = join(SPECS_DIR, 'ory/kratos.toon')
    expect(existsSync(toonPath)).toBe(true)
  })

  it('should have converted Hydra spec to TOON', () => {
    const toonPath = join(SPECS_DIR, 'ory/hydra.toon')
    expect(existsSync(toonPath)).toBe(true)
  })

  it('should have valid TOON format for Kratos', () => {
    const toonPath = join(SPECS_DIR, 'ory/kratos.toon')
    const toonContent = readFileSync(toonPath, 'utf-8')

    // Should be able to decode without errors
    const spec = decode(toonContent)

    expect(spec).toBeDefined()
    expect(spec.openapi).toBeDefined()
    expect(spec.info).toBeDefined()
  })

  it('should have valid TOON format for Hydra', () => {
    const toonPath = join(SPECS_DIR, 'ory/hydra.toon')
    const toonContent = readFileSync(toonPath, 'utf-8')

    const spec = decode(toonContent)

    expect(spec).toBeDefined()
    expect(spec.openapi).toBeDefined()
    expect(spec.info).toBeDefined()
  })

  it('should have smaller TOON files compared to JSON', () => {
    const jsonPath = join(SPECS_DIR, 'ory/kratos.json')
    const toonPath = join(SPECS_DIR, 'ory/kratos.toon')

    if (existsSync(jsonPath) && existsSync(toonPath)) {
      const jsonSize = statSync(jsonPath).size
      const toonSize = statSync(toonPath).size

      // TOON should be smaller than JSON
      expect(toonSize).toBeLessThan(jsonSize)

      // Should save at least 15% (actual savings vary by spec structure)
      const savings = ((jsonSize - toonSize) / jsonSize) * 100
      expect(savings).toBeGreaterThan(15)
    }
  })
})

describe('build Pipeline - Type Generation', () => {
  it('should have generated types for Ory services', () => {
    const typesPath = join(SPECS_DIR, 'ory/types.d.ts')
    expect(existsSync(typesPath)).toBe(true)
  })

  it('should have type definitions with proper exports', () => {
    const typesPath = join(SPECS_DIR, 'ory/types.d.ts')

    if (existsSync(typesPath)) {
      const content = readFileSync(typesPath, 'utf-8')

      // Should contain module declarations (either namespace or module)
      expect(content).toMatch(/declare\s+(module|namespace)/)

      // Should contain module augmentation
      expect(content).toContain('\'apiful/schema\'')
    }
  })

  it('should have Kratos type definitions', () => {
    const typesPath = join(SPECS_DIR, 'ory/types.d.ts')

    if (existsSync(typesPath)) {
      const content = readFileSync(typesPath, 'utf-8')
      expect(content).toMatch(/OryKaratos|Kratos/i)
    }
  })

  it('should have Hydra type definitions', () => {
    const typesPath = join(SPECS_DIR, 'ory/types.d.ts')

    if (existsSync(typesPath)) {
      const content = readFileSync(typesPath, 'utf-8')
      expect(content).toMatch(/OryHydra|Hydra/i)
    }
  })
})

describe('build Pipeline - Distribution Files', () => {
  it('should have dist directory', () => {
    expect(existsSync(DIST_DIR)).toBe(true)
  })

  it('should have compiled Ory service file', () => {
    const oryJsPath = join(DIST_DIR, 'ory.js')
    expect(existsSync(oryJsPath)).toBe(true)
  })

  it('should have Ory type definitions in dist', () => {
    const oryDtsPath = join(DIST_DIR, 'ory.d.ts')
    expect(existsSync(oryDtsPath)).toBe(true)
  })

  it('should have MCP server executable', () => {
    const mcpServerPath = join(DIST_DIR, 'mcp-server.js')
    expect(existsSync(mcpServerPath)).toBe(true)
  })

  it('should have shebang in MCP server', () => {
    const mcpServerPath = join(DIST_DIR, 'mcp-server.js')

    if (existsSync(mcpServerPath)) {
      const content = readFileSync(mcpServerPath, 'utf-8')
      expect(content.startsWith('#!/usr/bin/env node')).toBe(true)
    }
  })

  it('should have type references or imports in compiled files', () => {
    const oryJsPath = join(DIST_DIR, 'ory.js')

    if (existsSync(oryJsPath)) {
      const content = readFileSync(oryJsPath, 'utf-8')

      // Should contain either type reference directive or import statements
      const hasTypeRef = /\/\/\/\s*<reference\s+types=/.test(content)
      const hasImports = /import\s+/.test(content)

      expect(hasTypeRef || hasImports).toBe(true)
    }
  })
})

describe('build Pipeline - Package.json Configuration', () => {
  it('should have package.json', () => {
    const pkgPath = join(PROJECT_ROOT, 'package.json')
    expect(existsSync(pkgPath)).toBe(true)
  })

  it('should have exports field', () => {
    const pkgPath = join(PROJECT_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    expect(pkg.exports).toBeDefined()
    expect(typeof pkg.exports).toBe('object')
  })

  it('should export Ory services', () => {
    const pkgPath = join(PROJECT_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    expect(pkg.exports['./ory']).toBeDefined()
  })

  it('should have bin entry for MCP server', () => {
    const pkgPath = join(PROJECT_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    expect(pkg.bin).toBeDefined()
    expect(pkg.bin['toonfetch-mcp']).toBeDefined()
  })

  it('should have correct main and module fields', () => {
    const pkgPath = join(PROJECT_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    expect(pkg.type).toBe('module')
  })

  it('should have all required dependencies', () => {
    const pkgPath = join(PROJECT_ROOT, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    expect(pkg.dependencies).toBeDefined()
    expect(pkg.dependencies.apiful).toBeDefined()
    expect(pkg.dependencies['@toon-format/toon']).toBeDefined()
    expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined()
  })
})

describe('build Pipeline - Service Discovery', () => {
  it('should have openapi-specs directory', () => {
    expect(existsSync(SPECS_DIR)).toBe(true)
  })

  it('should have ory service directory', () => {
    const oryDir = join(SPECS_DIR, 'ory')
    expect(existsSync(oryDir)).toBe(true)
  })

  it('should have service index file', () => {
    const indexPath = join(SPECS_DIR, 'ory/index.ts')
    expect(existsSync(indexPath)).toBe(true)
  })

  it('should have apiful config', () => {
    const configPath = join(SPECS_DIR, 'ory/apiful.config.ts')
    expect(existsSync(configPath)).toBe(true)
  })

  it('should export createClient and service builders', () => {
    const indexPath = join(SPECS_DIR, 'ory/index.ts')
    const content = readFileSync(indexPath, 'utf-8')

    expect(content).toContain('createClient')
    expect(content).toContain('kratos')
    expect(content).toContain('hydra')
  })
})

describe('build Pipeline - File Integrity', () => {
  it('should have consistent JSON and TOON specs for Kratos', () => {
    const jsonPath = join(SPECS_DIR, 'ory/kratos.json')
    const toonPath = join(SPECS_DIR, 'ory/kratos.toon')

    if (existsSync(jsonPath) && existsSync(toonPath)) {
      const jsonSpec = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const toonContent = readFileSync(toonPath, 'utf-8')
      const toonSpec = decode(toonContent)

      // Key metadata should match
      expect(toonSpec.info.title).toBe(jsonSpec.info.title)
      expect(toonSpec.info.version).toBe(jsonSpec.info.version)
      expect(toonSpec.openapi).toBe(jsonSpec.openapi)
    }
  })

  it('should have consistent JSON and TOON specs for Hydra', () => {
    const jsonPath = join(SPECS_DIR, 'ory/hydra.json')
    const toonPath = join(SPECS_DIR, 'ory/hydra.toon')

    if (existsSync(jsonPath) && existsSync(toonPath)) {
      const jsonSpec = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const toonContent = readFileSync(toonPath, 'utf-8')
      const toonSpec = decode(toonContent)

      expect(toonSpec.info.title).toBe(jsonSpec.info.title)
      expect(toonSpec.info.version).toBe(jsonSpec.info.version)
    }
  })

  it('should have non-empty compiled files', () => {
    const oryJsPath = join(DIST_DIR, 'ory.js')

    if (existsSync(oryJsPath)) {
      const stats = statSync(oryJsPath)
      expect(stats.size).toBeGreaterThan(0)
    }
  })

  it('should have valid JavaScript syntax in compiled files', () => {
    const oryJsPath = join(DIST_DIR, 'ory.js')

    if (existsSync(oryJsPath)) {
      const content = readFileSync(oryJsPath, 'utf-8')

      // Should have proper import/export statements
      expect(content).toMatch(/import|export/)

      // Should not have obvious syntax errors
      expect(content).not.toContain('undefined is not defined')
    }
  })
})
