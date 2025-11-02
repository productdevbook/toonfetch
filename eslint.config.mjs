import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      '.github',
      'dist',
      '*.md',
      '.claude',
      'CLAUDE.md',
      'playground',
      '**.toon',
      'openapi-specs/**/*.json',
      'openapi-specs/**/*.yaml',
      'openapi-specs/**/*.yml',
    ],
  },
  {
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },
)
