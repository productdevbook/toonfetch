import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseApiSpec } from '../../src/type-parser'

describe('Type Parser', () => {
  it('should parse DigitalOcean API types', () => {
    const typesPath = join(process.cwd(), 'openapi-specs/digitalocean/types.d.ts')

    if (!existsSync(typesPath)) {
      console.warn('DigitalOcean types.d.ts not found, skipping test')
      return
    }

    const spec = parseApiSpec(typesPath, 'digitalocean')

    expect(spec).toBeDefined()
    expect(spec.paths.size).toBeGreaterThan(0)
  })

  it('should parse Hetzner API types', () => {
    const typesPath = join(process.cwd(), 'openapi-specs/hetzner/types.d.ts')

    if (!existsSync(typesPath)) {
      console.warn('Hetzner types.d.ts not found, skipping test')
      return
    }

    const spec = parseApiSpec(typesPath, 'hetzner')

    expect(spec).toBeDefined()
    expect(spec.paths.size).toBeGreaterThan(0)
  })

  it('should parse Ory Kratos API types', () => {
    const typesPath = join(process.cwd(), 'openapi-specs/ory/types.d.ts')

    if (!existsSync(typesPath)) {
      console.warn('Ory types.d.ts not found, skipping test')
      return
    }

    const spec = parseApiSpec(typesPath, 'ory')

    expect(spec).toBeDefined()
    expect(spec.paths.size).toBeGreaterThan(0)
  })

  it('should return valid spec structure', () => {
    const typesPath = join(process.cwd(), 'openapi-specs/digitalocean/types.d.ts')

    if (!existsSync(typesPath)) {
      console.warn('DigitalOcean types.d.ts not found, skipping test')
      return
    }

    const spec = parseApiSpec(typesPath, 'digitalocean')

    // Verify spec has required structure
    expect(spec).toBeDefined()
    expect(spec).toHaveProperty('paths')
    expect(spec.paths).toBeInstanceOf(Map)
    expect(spec.paths.size).toBeGreaterThan(0)

    // Verify at least one path exists with methods
    const firstPath = spec.paths.values().next().value
    expect(firstPath).toBeDefined()
  })
})
