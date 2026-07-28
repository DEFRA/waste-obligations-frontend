import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

export const forwardedPrefixRedirects = {
  plugin: {
    name: 'forwarded-prefix-redirects',
    register(server) {
      server.ext('onPreResponse', (request, h) => {
        const response = request.response
        const location = response?.headers?.location

        if (
          response?.isBoom ||
          !location ||
          response.statusCode < 300 ||
          response.statusCode >= 400
        ) {
          return h.continue
        }

        const externalLocation = withForwardedPrefix(request, location)

        if (externalLocation !== location) {
          response.header('location', externalLocation)
        }

        return h.continue
      })
    }
  }
}
