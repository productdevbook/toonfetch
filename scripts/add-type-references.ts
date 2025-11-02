#!/usr/bin/env tsx

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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

function addTypeReferences(): void {
  console.log('📝 Adding type references to .d.ts files...\n')

  const serviceDirs = findServiceDirectories()

  if (serviceDirs.length === 0) {
    console.log('⚠️  No service directories found')
    return
  }

  for (const service of serviceDirs) {
    const dtsPath = join(DIST_DIR, `${service}.d.ts`)
    const typesPath = join(DIST_DIR, service, 'types.d.ts')

    if (existsSync(dtsPath) && existsSync(typesPath)) {
      let content = readFileSync(dtsPath, 'utf-8')

      // Check if reference already exists
      const reference = `/// <reference types="./${service}/types.d.ts" />`

      if (!content.includes(reference)) {
        // Add reference at the top
        content = `${reference}\n${content}`
        writeFileSync(dtsPath, content)
        console.log(`  ✓ Added type reference for: ${service}`)
      }
      else {
        console.log(`  ℹ Type reference already exists for: ${service}`)
      }
    }
  }

  console.log('\n✅ Type references added successfully!')
}

addTypeReferences()
