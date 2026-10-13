import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, test, vi, beforeEach } from 'vitest'

const configGet = vi.fn()
const createViteServer = vi.fn()
const hapiConnectPlugin = { name: 'hapi-connect' }

vi.mock('#/config/config.js', () => ({
  config: { get: (key) => configGet(key) }
}))

vi.mock('vite', () => ({
  createServer: (...args) => createViteServer(...args)
}))

vi.mock('@defra/hapi-connect', () => ({
  default: hapiConnectPlugin
}))

vi.mock('./serve-static-files.js', () => ({
  serveStaticFiles: { plugin: { name: 'staticFiles', register: vi.fn() } }
}))

describe('router plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createViteServer.mockResolvedValue({ middlewares: ['vite-mw'] })
  })

  test('registers Vite middleware in local development', async () => {
    configGet.mockImplementation((key) => {
      if (key === 'isDevelopment') return true
      return undefined
    })

    const server = { register: vi.fn().mockResolvedValue(undefined) }
    const { router } = await import('./router.js')

    await router.plugin.register(server)

    expect(createViteServer).toHaveBeenCalledWith({
      server: { middlewareMode: true },
      appType: 'custom',
      // Absolute base is intentional for local font loading only — see
      // comments in router.js. Production must keep vite.config.js base './'.
      base: '/public/'
    })
    const viteRegistration = server.register.mock.calls.find(
      ([registration]) => registration?.plugin === hapiConnectPlugin
    )

    expect(viteRegistration?.[0]).toMatchObject({
      plugin: hapiConnectPlugin,
      options: { path: '/public' }
    })
    expect(viteRegistration?.[0]?.options?.middleware).toEqual([['vite-mw']])
    expect(createViteServer).toHaveBeenCalledOnce()
  })

  test('registers static file serving outside development', async () => {
    configGet.mockImplementation((key) => {
      if (key === 'isDevelopment') return false
      return undefined
    })

    const server = { register: vi.fn().mockResolvedValue(undefined) }
    const { router } = await import('./router.js')
    const { serveStaticFiles } = await import('./serve-static-files.js')

    await router.plugin.register(server)

    expect(createViteServer).not.toHaveBeenCalled()
    expect(server.register).toHaveBeenCalledWith(serveStaticFiles)
  })

  test('keeps the production Vite base relative so proxied deploys stay safe', async () => {
    const viteConfigPath = fileURLToPath(
      new URL('../../../vite.config.js', import.meta.url)
    )
    const viteConfigSource = await readFile(viteConfigPath, 'utf8')

    expect(viteConfigSource).toMatch(/\bbase:\s*['"]\.\/['"]/)
    expect(viteConfigSource).not.toMatch(/\bbase:\s*['"]\/public\/['"]/)
  })
})
