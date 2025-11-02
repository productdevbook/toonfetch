#!/usr/bin/env tsx

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OPENAPI_SPECS_DIR = 'openapi-specs'
const DIST_DIR = 'dist'

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

function copyTypesFiles(): void {
  console.log('📦 Copying types.d.ts files to dist...\n')

  // Ensure dist directory exists
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true })
  }

  const serviceDirs = findServiceDirectories()

  if (serviceDirs.length === 0) {
    console.log('⚠️  No service directories found')
    return
  }

  for (const service of serviceDirs) {
    const sourceTypesPath = join(OPENAPI_SPECS_DIR, service, 'types.d.ts')

    if (existsSync(sourceTypesPath)) {
      const destDir = join(DIST_DIR, service)
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }

      const destTypesPath = join(destDir, 'types.d.ts')
      copyFileSync(sourceTypesPath, destTypesPath)
      console.log(`  ✓ Copied types for: ${service}`)
    }
    else {
      console.log(`  ⚠  No types.d.ts found for: ${service}`)
    }
  }

  console.log('\n✅ Types files copied successfully!')
}

copyTypesFiles()
