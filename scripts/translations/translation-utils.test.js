import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  buildPageTranslationGroups,
  buildTranslationRows,
  buildWelshTranslations,
  extractTemplateTranslationKeys,
  findParentKey,
  flattenTranslations,
  readJsonFile,
  validateExportTranslationValues
} from './translation-utils.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

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

  test('validates export values do not include leading or trailing whitespace', () => {
    expect(() =>
      validateExportTranslationValues({
        common: {
          phaseBanner: {
            lead: 'This is a new service - your ',
            leadAfterLink: ' will help us to improve it.'
          }
        }
      })
    ).toThrow(
      [
        'English translation values must not include leading or trailing whitespace. Move spacing into the layout before exporting translations:',
        '- common.phaseBanner.lead',
        '- common.phaseBanner.leadAfterLink'
      ].join('\n')
    )
  })

  test('fails page translation grouping when export values include leading or trailing whitespace', async () => {
    await expect(
      buildPageTranslationGroups({
        englishTranslations: {
          home: {
            heading: ' Home'
          }
        },
        welshTranslations: {
          home: {
            heading: 'Home'
          }
        },
        pageMatrix: {
          pages: {
            home: {
              fileName: '01-home.xlsx',
              translationKeys: ['home.heading']
            }
          }
        },
        projectRoot
      })
    ).rejects.toThrow('- home.heading')
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
        projectRoot
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
      projectRoot
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
      projectRoot
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

  test('assigns every english translation key to a page workbook', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const welshTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/cy.json')
    )
    const pageMatrix = await readJsonFile(
      path.join(projectRoot, 'scripts/translations/page-matrix.json')
    )

    const groups = await buildPageTranslationGroups({
      englishTranslations,
      welshTranslations,
      pageMatrix,
      projectRoot
    })

    const assignedKeys = new Set(
      groups.flatMap((group) => group.rows.map((row) => row.translationKey))
    )
    const englishKeys = flattenTranslations(englishTranslations).map(
      (row) => row.key
    )
    const missing = englishKeys.filter((key) => !assignedKeys.has(key))

    expect(missing).toEqual([])
  })
})
