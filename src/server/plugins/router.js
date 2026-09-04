import inert from '@hapi/inert'

import { cookies } from '../routes/cookies/index.js'
import { auth } from '../routes/auth/index.js'
import { health } from '../routes/health/index.js'
import { producer } from '../routes/producer/index.js'
import { cso } from '../routes/cso/index.js'
import { serveStaticFiles } from './serve-static-files.js'
import { config } from '#/config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      await server.register([auth, cookies, producer, cso])

      // Static assets
      if (config.get('isDevelopment')) {
        await (async () => {
          const createViteServer = (await import('vite')).createServer
          // vite.config.js uses base: './' so production hashed assets stay
          // relative (reverse-proxy safe). In middleware mode Vite rewrites
          // GOV.UK font urls to root-absolute /node_modules/... which never
          // hits this /public-mounted middleware — override base so fonts are
          // requested under /public/... where Vite can serve them.
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'custom',
            base: '/public/'
          })

          await server.register({
            plugin: (await import('@defra/hapi-connect')).default,
            options: {
              path: '/public',
              middleware: [vite.middlewares]
            }
          })
        })()
      } else {
        server.register(serveStaticFiles)
      }
    }
  }
}
