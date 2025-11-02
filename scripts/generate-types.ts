#!/usr/bin/env tsx
/* eslint-disable node/prefer-global/process */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OPENAPI_SPECS_DIR = 'openapi-specs'

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  }
  catch {
    return false
  }
}

function findServiceDirectories(baseDir: string): string[] {
  if (!existsSync(baseDir)) {
    console.error(`❌ Directory not found: ${baseDir}`)
    return []
  }

  const entries = readdirSync(baseDir)
  const serviceDirs: string[] = []

  for (const entry of entries) {
    const fullPath = join(baseDir, entry)
    if (isDirectory(fullPath)) {
      // Check if directory has apiful.config.ts
      const configPath = join(fullPath, 'apiful.config.ts')
      if (existsSync(configPath)) {
        serviceDirs.push(fullPath)
      }
    }
  }

  return serviceDirs
}

function generateTypes(serviceDir: string): void {
  const serviceName = serviceDir.split('/').pop() || 'unknown'
  const absolutePath = join(process.cwd(), serviceDir)

  console.log(`\n🔨 Generating types for service: ${serviceName}`)
  console.log(`📁 Directory: ${serviceDir}`)

  try {
    const command = `pnpm apiful generate --root ${absolutePath} --outfile=./types.d.ts`
    console.log(`⚡ Running: ${command}`)

    execSync(command, {
      cwd: serviceDir,
      stdio: 'inherit',
    })

    console.log(`✅ Successfully generated types for ${serviceName}`)
  }
  catch (error) {
    console.error(`❌ Failed to generate types for ${serviceName}:`, error)
    process.exit(1)
  }
}

function main(): void {
  console.log('🚀 Starting type generation for all OpenAPI specs...\n')

  const serviceDirs = findServiceDirectories(OPENAPI_SPECS_DIR)

  if (serviceDirs.length === 0) {
    console.log('⚠️  No service directories with apiful.config.ts found')
    return
  }

  console.log(`📋 Found ${serviceDirs.length} service(s):`)
  serviceDirs.forEach(dir => console.log(`   - ${dir}`))

  for (const serviceDir of serviceDirs) {
    generateTypes(serviceDir)
  }

  console.log('\n🎉 All types generated successfully!')
}

main()
