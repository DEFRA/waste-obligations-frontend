import { describe, expect, test, vi } from 'vitest'

import { getDevelopmentTls } from './development-tls.js'

describe('getDevelopmentTls', () => {
  test('returns TLS options when development certs exist', () => {
    const fs = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi
        .fn()
        .mockReturnValueOnce(Buffer.from('key'))
        .mockReturnValueOnce(Buffer.from('cert'))
    }

    expect(
      getDevelopmentTls({
        isDevelopment: true,
        certsDir: '/certs',
        fs
      })
    ).toEqual({
      key: Buffer.from('key'),
      cert: Buffer.from('cert')
    })
  })

  test('returns undefined when cert files are missing', () => {
    const fs = {
      existsSync: vi.fn().mockReturnValue(false),
      readFileSync: vi.fn()
    }

    expect(
      getDevelopmentTls({
        isDevelopment: true,
        certsDir: '/certs',
        fs
      })
    ).toBeUndefined()
    expect(fs.readFileSync).not.toHaveBeenCalled()
  })

  test('returns undefined outside development', () => {
    const fs = {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn()
    }

    expect(
      getDevelopmentTls({
        isDevelopment: false,
        certsDir: '/certs',
        fs
      })
    ).toBeUndefined()
    expect(fs.existsSync).not.toHaveBeenCalled()
  })
})
