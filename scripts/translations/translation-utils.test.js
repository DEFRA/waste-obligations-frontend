import { describe, expect, test } from 'vitest'
import {
  buildPageTranslationGroups,
  buildTranslationRows,
  buildWelshTranslations,
  extractTemplateTranslationKeys,
  findParentKey,
  flattenTranslations
} from './translation-utils.js'

describe('translation utils', () => {
  test('flattens nested translation strings', () => {
    expect(
      flattenTranslations({
        compliance: {
          certificate: {
            heading: 'About your certificate',
            count: 1
          }
        }
      })
    ).toEqual([
      {
        key: 'compliance.certificate.heading',
        value: 'About your certificate'
      }
    ])
  })

  test('finds the nearest parent key in the page matrix', () => {
    expect(
      findParentKey('compliance.certificateSubmit.material.glass', {
        'compliance.certificateSubmit': {},
        'compliance.certificateSubmit.material': {}
      })
    ).toBe('compliance.certificateSubmit.material')
  })

  test('builds rows and leaves matching Welsh values blank', () => {
    const rows = buildTranslationRows({
      englishTranslations: {
        auth: {
          signInFailed: {
            heading: 'Sign in failed',
            noCredentials: 'We could not sign you in. Try again.'
          }
        }
      },
      welshTranslations: {
        auth: {
          signInFailed: {
            heading: 'Methu mewngofnodi',
            noCredentials: 'We could not sign you in. Try again.'
          }
        }
      },
      pageMatrix: {
        'auth.signInFailed': {
          figmaUrl: 'https://www.figma.com/example',
          generic: false,
          notes: 'Sign in failed page'
        }
      }
    })

    expect(rows).toEqual([
      {
        translationKey: 'auth.signInFailed.heading',
        parentKey: 'auth.signInFailed',
        english: 'Sign in failed',
        welsh: 'Methu mewngofnodi',
        figmaUrl: 'https://www.figma.com/example',
        generic: false,
        notes: 'Sign in failed page'
      },
      {
        translationKey: 'auth.signInFailed.noCredentials',
        parentKey: 'auth.signInFailed',
        english: 'We could not sign you in. Try again.',
        welsh: '',
        figmaUrl: 'https://www.figma.com/example',
        generic: false,
        notes: 'Sign in failed page'
      }
    ])
  })

  test('builds Welsh translations from imported rows and preserves blanks', () => {
    const translations = buildWelshTranslations({
      englishTranslations: {
        auth: {
          signInFailed: {
            heading: 'Sign in failed',
            noCredentials: 'We could not sign you in. Try again.'
          }
        }
      },
      currentWelshTranslations: {
        auth: {
          signInFailed: {
            heading: 'Old Welsh heading',
            noCredentials: 'Existing Welsh credentials'
          }
        }
      },
      translatedRows: [
        {
          translationKey: 'auth.signInFailed.heading',
          welsh: 'Pennawd Cymraeg newydd'
        },
        {
          translationKey: 'auth.signInFailed.noCredentials',
          welsh: ''
        }
      ]
    })

    expect(translations).toEqual({
      auth: {
        signInFailed: {
          heading: 'Pennawd Cymraeg newydd',
          noCredentials: 'Existing Welsh credentials'
        }
      }
    })
  })

  test('extracts page translation keys from templates and resolves component fallbacks', async () => {
    await expect(
      extractTemplateTranslationKeys({
        template: 'compliance/producer/certificate/index',
        localeBase: 'compliance.certificate',
        englishTranslations: {
          common: {
            continue: 'Continue',
            warningIconFallback: 'Warning'
          },
          compliance: {
            certificate: {
              heading: 'About your certificate'
            },
            components: {
              about: {
                mustIntro: 'You must:',
                warning: 'Warning text'
              }
            }
          }
        },
        projectRoot: process.cwd()
      })
    ).resolves.toEqual(
      expect.arrayContaining([
        'compliance.certificate.heading',
        'compliance.components.about.mustIntro',
        'compliance.components.about.warning',
        'common.continue',
        'common.warningIconFallback'
      ])
    )
  })

  test('builds page groups from a page matrix', async () => {
    const groups = await buildPageTranslationGroups({
      englishTranslations: {
        home: {
          pageTitle: 'Home',
          heading: 'Home'
        },
        common: {
          serviceName: 'Report packaging data'
        }
      },
      welshTranslations: {
        home: {
          pageTitle: 'Cartref',
          heading: 'Home'
        },
        common: {
          serviceName: 'Report packaging data'
        }
      },
      pageMatrix: {
        pages: {
          home: {
            route: '/',
            template: 'home/index',
            localeBase: 'home',
            figmaUrl: 'https://www.figma.com/example',
            notes: 'Home page'
          }
        }
      },
      projectRoot: process.cwd()
    })

    expect(groups).toMatchObject([
      {
        id: 'home',
        route: '/',
        rows: [
          {
            translationKey: 'home.pageTitle',
            english: 'Home',
            welsh: 'Cartref',
            figmaUrl: 'https://www.figma.com/example'
          },
          {
            translationKey: 'home.heading',
            english: 'Home',
            welsh: '',
            figmaUrl: 'https://www.figma.com/example'
          },
          {
            translationKey: 'common.serviceName',
            english: 'Report packaging data',
            welsh: '',
            figmaUrl: 'https://www.figma.com/example'
          }
        ]
      }
    ])
  })

  test('assigns each translation key to the first matching page only', async () => {
    const groups = await buildPageTranslationGroups({
      englishTranslations: {
        common: {
          continue: 'Continue'
        },
        home: {
          heading: 'Home'
        }
      },
      welshTranslations: {
        common: {
          continue: 'Continue'
        },
        home: {
          heading: 'Home'
        }
      },
      pageMatrix: {
        pages: {
          shared: {
            fileName: '00-shared.xlsx',
            translationKeys: ['common.continue']
          },
          home: {
            fileName: '01-home.xlsx',
            translationKeys: ['home.heading', 'common.continue']
          }
        }
      },
      projectRoot: process.cwd()
    })

    expect(groups[0].rows.map((row) => row.translationKey)).toEqual([
      'common.continue'
    ])
    expect(groups[1].rows.map((row) => row.translationKey)).toEqual([
      'home.heading'
    ])
    expect(groups[1].translatorNotes).toEqual([
      'Reusable content rendered on this page is translated in: 00-shared.xlsx.'
    ])
  })
})
