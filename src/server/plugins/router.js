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
          // LOCAL DEVELOPMENT ONLY — never copy this base into vite.config.js
          // or any production build path.
          //
          // vite.config.js keeps base: './' so production hashed CSS/JS emit
          // relative font and asset URLs (safe under X-Forwarded-Prefix).
          // This createServer() override is used only when isDevelopment is
          // true; production registers serveStaticFiles instead and never
          // starts Vite middleware.
          //
          // Why override here: in middleware mode Vite rewrites GOV.UK font
          // urls to root-absolute /node_modules/..., which miss this
          // /public-mounted middleware and 404 locally. base: '/public/'
          // makes those requests hit Vite. Trade-off: those absolute
          // /public/... URLs are not prefix-aware, so reverse-proxy local
          // setups may still 404 fonts/HMR — accept that for direct local
          // font loading, and rely on relative base for deployed builds.
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
