import type { UserConfig, UserConfigFn } from 'tsdown/config'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'tsdown/config'

// Automatically find all services in openapi-specs
function findServiceEntries(): Record<string, string> {
  const entries: Record<string, string> = {}
  const specsDir = 'openapi-specs'

  if (!existsSync(specsDir)) {
    return entries
  }

  const serviceDirs = readdirSync(specsDir)

  for (const serviceDir of serviceDirs) {
    const fullPath = join(specsDir, serviceDir)
    if (statSync(fullPath).isDirectory()) {
      const indexPath = join(fullPath, 'index.ts')
      if (existsSync(indexPath)) {
        entries[serviceDir] = indexPath
      }
    }
  }

  return entries
}

const config: UserConfig | UserConfigFn = defineConfig({
  entry: {
    ...findServiceEntries(),
    'mcp-server': 'src/mcp-server.ts',
  },
  dts: true,
  outDir: 'dist',
})

export default config
