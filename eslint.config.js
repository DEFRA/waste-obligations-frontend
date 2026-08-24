import neostandard from 'neostandard'

export default neostandard({
  env: ['node', 'vitest'],
  ignores: [
    ...neostandard.resolveIgnoresFromGitignore(),
    'src/client/javascripts/html2pdf-0.9.3.min.js'
  ],
  noJsx: true,
  noStyle: true
})
