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
    ],
  },
  {
    rules: {
    },
  },
)
