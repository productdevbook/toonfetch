import { Buffer } from 'node:buffer'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { encode } from '@toon-format/toon'
/**
 * Convert JSON files to TOON format
 */

const files = [
  {
    input: 'openapi-specs/ory/hydra.json',
    output: 'openapi-specs/ory/hydra.toon',
  },
  {
    input: 'openapi-specs/ory/kratos.json',
    output: 'openapi-specs/ory/kratos.toon',
  },
]

console.log('Converting JSON files to TOON format...\n')

for (const file of files) {
  try {
    const inputPath = resolve(file.input)
    const outputPath = resolve(file.output)

    // Read JSON file
    const jsonContent = readFileSync(inputPath, 'utf-8')
    const jsonData = JSON.parse(jsonContent)

    // Convert to TOON format
    const toonContent = encode(jsonData)

    // Write TOON file
    writeFileSync(outputPath, toonContent, 'utf-8')

    // Calculate size reduction
    const jsonSize = Buffer.byteLength(jsonContent, 'utf-8')
    const toonSize = Buffer.byteLength(toonContent, 'utf-8')
    const reduction = ((1 - toonSize / jsonSize) * 100).toFixed(2)

    console.log(`✓ ${file.input}`)
    console.log(`  JSON: ${(jsonSize / 1024).toFixed(2)} KB`)
    console.log(`  TOON: ${(toonSize / 1024).toFixed(2)} KB`)
    console.log(`  Reduction: ${reduction}%\n`)
  }
  catch (error) {
    console.error(`✗ Failed to convert ${file.input}:`, error)
  }
}

console.log('Conversion complete!')
