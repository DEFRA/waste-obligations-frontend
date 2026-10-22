import neostandard from 'neostandard'

export default neostandard({
  env: ['node', 'vitest'],
  ignores: [...neostandard.resolveIgnoresFromGitignore(), 'vendor/**'],
  noJsx: true,
  noStyle: true
})
