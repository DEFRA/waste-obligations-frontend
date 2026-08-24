import { defineConfig } from 'vite'
import { NodePackageImporter } from 'sass-embedded'

export default defineConfig({
  // Emit URLs relative to the CSS or JavaScript file so they work beneath a
  // request-specific reverse-proxy prefix.
  base: './',
  build: {
    outDir: '.public',
    manifest: true,
    rolldownOptions: {
      input: {
        htmlAssets: 'src/client/assets.html',
        application: 'src/client/javascripts/application.js',
        applicationCss: 'src/client/stylesheets/application.scss'
      }
    },
    sourcemap: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        importers: [new NodePackageImporter()],
        loadPaths: [
          'node_modules',
          'src/client/stylesheets',
          'src/server',
          'src/server/common/components',
          'src/server/common/templates/partials'
        ],
        quietDeps: true,
        sourceMapIncludeSources: true,
        style: 'expanded'
      }
    },
    lightningcss: { errorRecovery: true }
  },
  // Dev server
  server: {
    hmr: true,
    forwardConsole: {
      unhandledErrors: true,
      logLevels: ['warn', 'error']
    }
  }
})
