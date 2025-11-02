#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OPENAPI_SPECS_DIR = 'openapi-specs'
const PACKAGE_JSON_PATH = 'package.json'

function findServiceDirectories(): string[] {
  if (!existsSync(OPENAPI_SPECS_DIR)) {
    return []
  }

  const entries = readdirSync(OPENAPI_SPECS_DIR)
  const serviceDirs: string[] = []

  for (const entry of entries) {
    const fullPath = join(OPENAPI_SPECS_DIR, entry)
    if (statSync(fullPath).isDirectory()) {
      const indexPath = join(fullPath, 'index.ts')
      if (existsSync(indexPath)) {
        serviceDirs.push(entry)
      }
    }
  }

  return serviceDirs
}

function updatePackageExports(): void {
  console.log('🔧 Updating package.json exports...\n')

  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
  const serviceDirs = findServiceDirectories()

  if (serviceDirs.length === 0) {
    console.log('⚠️  No service directories found')
    return
  }

  // Build exports object
  const exports: Record<string, any> = {}

  for (const service of serviceDirs) {
    exports[`./${service}`] = {
      types: `./dist/${service}.d.ts`,
      import: `./dist/${service}.js`,
    }
    console.log(`  ✓ Added export for: ${service}`)
  }

  packageJson.exports = exports

  writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`)

  console.log('\n✅ package.json exports updated successfully!')
}

updatePackageExports()
