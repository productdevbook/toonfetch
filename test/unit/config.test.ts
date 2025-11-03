import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config'

describe('Config', () => {
  it('should load default configuration', () => {
    const config = loadConfig()

    expect(config).toBeDefined()
    expect(config.server.name).toBe('sufetch-mcp')
    expect(config.server.version).toBe('0.3.0')
  })

  it('should have default cache settings', () => {
    const config = loadConfig()

    expect(config.cache.exampleSize).toBe(100)
    expect(config.cache.exampleTTL).toBe(5 * 60 * 1000) // 5 minutes
  })

  it('should have default HTTP settings', () => {
    const config = loadConfig()

    expect(config.http.methods).toContain('get')
    expect(config.http.methods).toContain('post')
    expect(config.http.successCodes).toContain(200)
    expect(config.http.successCodes).toContain(201)
  })

  it('should respect SUFETCH_DEBUG environment variable', () => {
    const originalValue = process.env.SUFETCH_DEBUG

    process.env.SUFETCH_DEBUG = 'true'
    const configWithDebug = loadConfig()
    expect(configWithDebug.debug).toBe(true)

    process.env.SUFETCH_DEBUG = 'false'
    const configWithoutDebug = loadConfig()
    expect(configWithoutDebug.debug).toBe(false)

    // Restore original value
    if (originalValue === undefined) {
      delete process.env.SUFETCH_DEBUG
    }
    else {
      process.env.SUFETCH_DEBUG = originalValue
    }
  })

  it('should have schema configuration', () => {
    const config = loadConfig()

    expect(config.schemas.identifierFields).toContain('id')
    expect(config.schemas.identifierFields).toContain('uuid')
    expect(config.schemas.importantFieldPatterns).toContain('name')
    expect(config.schemas.importantFieldPatterns).toContain('title')
  })

  it('should have example value defaults', () => {
    const config = loadConfig()

    expect(config.exampleValues.defaultEmail).toBe('user@example.com')
    expect(config.exampleValues.defaultUrl).toBe('https://example.com')
    expect(config.exampleValues.defaultNumber).toBe(10)
    expect(config.exampleValues.defaultInteger).toBe(1)
    expect(config.exampleValues.defaultBoolean).toBe(true)
    expect(config.exampleValues.getCurrentTimestamp).toBeDefined()
    expect(typeof config.exampleValues.getCurrentTimestamp()).toBe('string')
  })
})
