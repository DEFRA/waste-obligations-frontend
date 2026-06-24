import { vi } from 'vitest'

const mockReadFileSync = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('node:fs', async () => {
  const nodeFs = await import('node:fs')

  return {
    ...nodeFs,
    readFileSync: (filePath, encoding) => {
      if (String(filePath).includes('/locales/')) {
        return nodeFs.readFileSync(filePath, encoding)
      }

      return mockReadFileSync(filePath)
    }
  }
})
vi.mock('../../../server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: (...args) => mockLoggerError(...args) })
}))
vi.mock(import('#/config/config.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    config: {
      get(key) {
        if (key === 'isProduction') return true
        return originalModule.config.get(key)
      }
    }
  }
})

describe('context and cache', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset()
    mockLoggerError.mockReset()
    vi.resetModules()
  })

  describe('#context', () => {
    const mockRequest = { path: '/' }

    describe('When Vite manifest file read succeeds', () => {
      let contextImport
      let contextResult

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets',
          eprPackaging: {
            homeUrl: 'https://localhost:7084/report-data',
            accessibilityUrl:
              'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-accessibility-statement',
            cookiesUrl: 'https://localhost:7084/report-data/cookies',
            feedbackUrl:
              'https://defragroup.eu.qualtrics.com/jfe/form/SV_e5HK8ijKACZGi1M',
            manageYourRecyclingObligationsUrl:
              'https://localhost:7084/report-data/manage-your-recycling-obligations',
            privacyUrl:
              'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-privacy-policy',
            supportEmail: 'eprcustomerservice@defra.gov.uk',
            supportTelephone: '0300 060 0002'
          },
          getAssetPath: expect.any(Function),
          languageSwitcher: {
            en: '/?lang=en',
            cy: '/?lang=cy'
          },
          locale: 'en',
          navigation: [
            {
              text: 'Home',
              href: 'https://localhost:7084/report-data',
              active: true
            },
            {
              text: 'Manage account',
              href: 'https://localhost:7084/manage-account'
            },
            {
              text: 'Sign out',
              href: 'https://localhost:7084/report-data/Account/SignOut'
            }
          ],
          backLink: 'https://localhost:7084/report-data',
          serviceName: 'waste-obligations-frontend',
          serviceUrl: 'https://localhost:7084/report-data'
        })
      })

      describe('With valid asset path', () => {
        test('Should provide expected asset path', () => {
          expect(contextResult.getAssetPath('application.js')).toBe(
            '/public/application.js'
          )
        })
      })

      describe('With invalid asset path', () => {
        test('Should provide expected asset', () => {
          expect(contextResult.getAssetPath('an-image.png')).toBe(
            '/public/an-image.png'
          )
        })
      })
    })

    describe('When Vite manifest file read fails', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        mockReadFileSync.mockImplementation(() => {
          throw new Error('File not found')
        })

        contextImport.context(mockRequest)
      })

      test('Should log that the Vite Manifest file is not available', () => {
        expect(mockLoggerError).toHaveBeenCalledWith(
          'Vite manifest.json not found'
        )
      })
    })
  })

  describe('#context cache', () => {
    const mockRequest = { path: '/' }
    let contextResult

    describe('Vite manifest file cache', () => {
      let contextImport

      beforeAll(async () => {
        contextImport = await import('./context.js')
      })

      beforeEach(() => {
        // Return JSON string
        mockReadFileSync.mockReturnValue(`{
        "application.js": "javascripts/application.js",
        "stylesheets/application.scss": "stylesheets/application.css"
      }`)

        contextResult = contextImport.context(mockRequest)
      })

      test('Should read file', () => {
        expect(mockReadFileSync).toHaveBeenCalled()
      })

      test('Should use cache', () => {
        expect(mockReadFileSync).not.toHaveBeenCalled()
      })

      test('Should provide expected context', () => {
        expect(contextResult).toEqual({
          assetPath: '/public/assets',
          eprPackaging: {
            homeUrl: 'https://localhost:7084/report-data',
            accessibilityUrl:
              'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-accessibility-statement',
            cookiesUrl: 'https://localhost:7084/report-data/cookies',
            feedbackUrl:
              'https://defragroup.eu.qualtrics.com/jfe/form/SV_e5HK8ijKACZGi1M',
            manageYourRecyclingObligationsUrl:
              'https://localhost:7084/report-data/manage-your-recycling-obligations',
            privacyUrl:
              'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-privacy-policy',
            supportEmail: 'eprcustomerservice@defra.gov.uk',
            supportTelephone: '0300 060 0002'
          },
          getAssetPath: expect.any(Function),
          languageSwitcher: {
            en: '/?lang=en',
            cy: '/?lang=cy'
          },
          locale: 'en',
          navigation: [
            {
              text: 'Home',
              href: 'https://localhost:7084/report-data',
              active: true
            },
            {
              text: 'Manage account',
              href: 'https://localhost:7084/manage-account'
            },
            {
              text: 'Sign out',
              href: 'https://localhost:7084/report-data/Account/SignOut'
            }
          ],
          backLink: 'https://localhost:7084/report-data',
          serviceName: 'waste-obligations-frontend',
          serviceUrl: 'https://localhost:7084/report-data'
        })
      })
    })
  })
})
