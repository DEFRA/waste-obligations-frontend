import { vi } from 'vitest'

import {
  nextSignOutHop,
  readSignOutChain,
  THEN_FINISH,
  THEN_SIGN_OUT
} from './sign-out-chain.js'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('#/config/config.js', () => ({
  config: { get: configGetMock }
}))

const MRO = '/manage-recycling-obligations'
const SECOND = '/second-frontend'
const THIRD = '/third-frontend'

function useFrontends(frontendPaths) {
  configGetMock.mockImplementation((key) => {
    if (key === 'sharedAuth.signOutFrontendPaths') {
      return frontendPaths
    }
    if (key === 'auth.azureAdB2c.allowedHosts') {
      return ['localhost', '.defra.gov.uk']
    }
    return undefined
  })
}

function requestAt(prefix, query = {}) {
  return {
    headers: {
      'x-forwarded-prefix': prefix,
      'x-forwarded-host': 'report-packaging.defra.gov.uk',
      'x-forwarded-proto': 'https'
    },
    info: { host: 'internal:3000' },
    server: { info: { protocol: 'http' } },
    query
  }
}

const origin = 'https://report-packaging.defra.gov.uk'

describe('#sign-out-chain', () => {
  describe('nextSignOutHop', () => {
    test('Should send sign-out from the first frontend to the second frontend', () => {
      useFrontends([MRO, SECOND])

      expect(nextSignOutHop(requestAt(MRO), { then: THEN_SIGN_OUT })).toBe(
        `${origin}${SECOND}/clear-session?signOutStart=0&signOutThen=sign-out`
      )
    })

    test('Should wrap round from the last frontend to the first', () => {
      useFrontends([MRO, SECOND])

      expect(nextSignOutHop(requestAt(SECOND), { then: THEN_SIGN_OUT })).toBe(
        `${origin}${MRO}/clear-session?signOutStart=1&signOutThen=sign-out`
      )
    })

    test('Should stop when the next frontend is the one sign-out started at', () => {
      useFrontends([MRO, SECOND])

      expect(
        nextSignOutHop(requestAt(SECOND), {
          startIndex: 0,
          then: THEN_SIGN_OUT
        })
      ).toBeNull()
    })

    test('Should visit every other frontend once in a chain of three', () => {
      useFrontends([MRO, SECOND, THIRD])

      expect(
        nextSignOutHop(requestAt(THIRD), { then: THEN_SIGN_OUT })
      ).toContain(`${MRO}/clear-session?signOutStart=2`)
      expect(
        nextSignOutHop(requestAt(MRO), { startIndex: 2, then: THEN_SIGN_OUT })
      ).toContain(`${SECOND}/clear-session?signOutStart=2`)
      expect(
        nextSignOutHop(requestAt(SECOND), {
          startIndex: 2,
          then: THEN_SIGN_OUT
        })
      ).toBeNull()
    })

    test('Should carry finish when B2C sign-out has already happened', () => {
      useFrontends([MRO, SECOND])

      expect(nextSignOutHop(requestAt(MRO), { then: THEN_FINISH })).toBe(
        `${origin}${SECOND}/clear-session?signOutStart=0&signOutThen=finish`
      )
    })

    test('Should not chain when the list is empty or has one frontend', () => {
      useFrontends([])
      expect(nextSignOutHop(requestAt(MRO), { then: THEN_SIGN_OUT })).toBeNull()

      useFrontends([MRO])
      expect(nextSignOutHop(requestAt(MRO), { then: THEN_SIGN_OUT })).toBeNull()
    })

    test('Should not chain when this frontend is not behind a listed prefix', () => {
      useFrontends([MRO, SECOND])

      expect(nextSignOutHop(requestAt(''), { then: THEN_SIGN_OUT })).toBeNull()
      expect(
        nextSignOutHop(requestAt('/somewhere-else'), { then: THEN_SIGN_OUT })
      ).toBeNull()
    })

    test('Should ignore trailing slashes and entries that are not rooted paths', () => {
      useFrontends([
        `${MRO}/`,
        'https://evil.example',
        '//evil.example',
        SECOND
      ])

      expect(nextSignOutHop(requestAt(MRO), { then: THEN_SIGN_OUT })).toBe(
        `${origin}${SECOND}/clear-session?signOutStart=0&signOutThen=sign-out`
      )
    })

    test('Should refuse a host that is not allowed', () => {
      useFrontends([MRO, SECOND])
      const request = requestAt(MRO)
      request.headers['x-forwarded-host'] = 'evil.example'

      expect(() => nextSignOutHop(request, { then: THEN_SIGN_OUT })).toThrow()
    })
  })

  describe('readSignOutChain', () => {
    test('Should read a valid chain', () => {
      useFrontends([MRO, SECOND])

      expect(
        readSignOutChain(
          requestAt(SECOND, { signOutStart: '0', signOutThen: 'sign-out' })
        )
      ).toEqual({ startIndex: 0, then: THEN_SIGN_OUT })
    })

    test.each([
      [{}],
      [{ signOutStart: '0' }],
      [{ signOutThen: 'finish' }],
      [{ signOutStart: '2', signOutThen: 'finish' }],
      [{ signOutStart: '-1', signOutThen: 'finish' }],
      [{ signOutStart: '0.5', signOutThen: 'finish' }],
      [{ signOutStart: ['0', '1'], signOutThen: 'finish' }],
      [{ signOutStart: '0', signOutThen: 'https://evil.example' }]
    ])('Should ignore an invalid chain %j', (query) => {
      useFrontends([MRO, SECOND])

      expect(readSignOutChain(requestAt(SECOND, query))).toBeNull()
    })
  })
})
