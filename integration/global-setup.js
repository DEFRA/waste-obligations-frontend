import {
  integrationDirectBaseUrl,
  integrationProxyBaseUrl,
  integrationServiceBaseUrl
} from './env.js'

const DEFAULT_WIREMOCK_URL = 'http://localhost:9080'
const DEFAULT_REDIS_HOST = '127.0.0.1'
const DEFAULT_REDIS_PORT = 6379

const CHECK_TIMEOUT_MS = Number(
  process.env.INTEGRATION_SETUP_TIMEOUT_MS ?? 120_000
)
const CHECK_INTERVAL_MS = 2_000

function integrationEnv() {
  return {
    appUrls: [
      { name: 'direct app', url: integrationDirectBaseUrl() },
      ...(integrationProxyBaseUrl()
        ? [{ name: 'reverse proxy', url: integrationProxyBaseUrl() }]
        : [])
    ],
    wiremockUrl: process.env.INTEGRATION_WIREMOCK_URL ?? DEFAULT_WIREMOCK_URL,
    redisHost: process.env.INTEGRATION_REDIS_HOST ?? DEFAULT_REDIS_HOST,
    redisPort: Number(process.env.INTEGRATION_REDIS_PORT ?? DEFAULT_REDIS_PORT)
  }
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function waitFor(description, check, errors) {
  const deadline = Date.now() + CHECK_TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      await check()
      return
    } catch (error) {
      errors.push(`${description}: ${error.message}`)
      errors.splice(0, errors.length - 3)
      await sleep(CHECK_INTERVAL_MS)
    }
  }

  throw new Error(
    [
      'Integration test stack is not ready.',
      `Timed out after ${CHECK_TIMEOUT_MS}ms waiting for dependencies.`,
      '',
      'Recent errors:',
      ...errors,
      '',
      'Start the stack with one of:',
      '  npm run integration:up && npm run test:integration:docker',
      '  npm run integration:deps && npm run integration:serve  (then npm run test:integration)',
      '',
      'Ensure Redis, WireMock (:9080), and the app are reachable.'
    ].join('\n')
  )
}

async function checkAppHealth(appUrl) {
  const response = await fetch(
    new URL('health', integrationServiceBaseUrl(appUrl)),
    {
      signal: AbortSignal.timeout(5_000)
    }
  )

  if (!response.ok) {
    throw new Error(`GET /health returned ${response.status}`)
  }

  const body = await response.json()
  if (body?.message !== 'success') {
    throw new Error(`Unexpected /health payload: ${JSON.stringify(body)}`)
  }
}

async function checkWireMock(wiremockUrl) {
  const response = await fetch(
    `${wiremockUrl}/organisations/a1b2c3d4-e5f6-4789-abcd-ef1234567890/compliance-declarations?obligationYear=2026`,
    { signal: AbortSignal.timeout(5_000) }
  )

  if (!response.ok) {
    throw new Error(
      `WireMock compliance-declarations stub returned ${response.status}`
    )
  }
}

async function checkRedis(redisHost, redisPort) {
  const { default: Redis } = await import('ioredis')
  const client = new Redis({
    host: redisHost,
    port: redisPort,
    connectTimeout: 5_000,
    maxRetriesPerRequest: 1,
    lazyConnect: true
  })

  try {
    await client.connect()
    const pong = await client.ping()
    if (pong !== 'PONG') {
      throw new Error(`Unexpected Redis ping response: ${pong}`)
    }
  } finally {
    client.disconnect()
  }
}

export default async function globalSetup() {
  const { appUrls, wiremockUrl, redisHost, redisPort } = integrationEnv()
  const errors = []

  for (const { name, url } of appUrls) {
    await waitFor(`${name} health (${url})`, () => checkAppHealth(url), errors)
  }
  await waitFor(
    `WireMock (${wiremockUrl})`,
    () => checkWireMock(wiremockUrl),
    errors
  )
  await waitFor(
    `Redis (${redisHost}:${redisPort})`,
    () => checkRedis(redisHost, redisPort),
    errors
  )
}
