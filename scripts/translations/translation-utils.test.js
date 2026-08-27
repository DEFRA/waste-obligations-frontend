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
  getPageTranslationKeys,
  readJsonFile,
  validateExportTranslationValues
} from './translation-utils.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(dirname, '../..')

function expectKeysInOrder(keys, expectedOrder) {
  for (const key of expectedOrder) {
    expect(keys, `missing translation key ${key}`).toContain(key)
  }

  for (let index = 0; index < expectedOrder.length - 1; index += 1) {
    const currentKey = expectedOrder[index]
    const nextKey = expectedOrder[index + 1]

    expect(
      keys.indexOf(currentKey),
      `${currentKey} should appear before ${nextKey}`
    ).toBeLessThan(keys.indexOf(nextKey))
  }
}

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

  test('orders page translation keys by on-page usage', async () => {
    const keys = await extractTemplateTranslationKeys({
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
              description1: 'Description',
              mustIntro: 'You must:',
              mustBullet1: 'Bullet 1',
              warning: 'Warning text',
              howToTitle: 'How to submit',
              alreadySubmittedLead: 'Already submitted',
              viewSubmissionButton: 'View submission'
            }
          }
        }
      },
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.certificate.heading',
      'compliance.components.about.description1',
      'compliance.components.about.mustIntro',
      'compliance.components.about.mustBullet1',
      'compliance.components.about.warning',
      'compliance.components.about.howToTitle'
    ])
  })

  test('orders summary text before and after bullet lists', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/cso/statement/index',
      localeBase: 'compliance.statement',
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.components.about.introPrefix',
      'compliance.components.about.introSuffix',
      'compliance.components.about.bullet1',
      'compliance.components.about.bullet2',
      'compliance.components.about.bullet3',
      'compliance.statement.components.about.description1',
      'compliance.components.about.mustIntro',
      'compliance.statement.components.about.mustBullet1',
      'compliance.statement.components.about.mustBullet2',
      'compliance.components.about.warning',
      'compliance.statement.components.about.howToTitle',
      'compliance.components.about.howToBeforeSubmitIntro',
      'compliance.components.about.howToBullet1',
      'compliance.components.about.howToBulletFullName',
      'compliance.statement.components.about.regulatorContact',
      'compliance.components.about.finalStatusIntro',
      'compliance.components.about.finalStatusBullet1',
      'compliance.components.about.finalStatusBullet2'
    ])
  })

  test('orders declaration intro before bullets and form fields after', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/producer/certificate-submit/index',
      localeBase: 'compliance.certificateSubmit',
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.components.declaration.heading',
      'compliance.components.declaration.intro',
      'compliance.components.declaration.bullet1',
      'compliance.components.declaration.bullet3',
      'compliance.components.declaration.fullNameLabel'
    ])
  })

  test('orders success regulator summary before bullets and follow-up after', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/producer/certificate-success/index',
      localeBase: 'compliance.certificateSuccess',
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.components.success.certificateLinkLead',
      'compliance.components.success.manageObligationsLink',
      'compliance.components.success.certificateLinkSuffix',
      'compliance.components.success.regulatorMayAsk',
      'compliance.components.success.regulatorBullet1',
      'compliance.components.success.regulatorBullet2',
      'compliance.components.success.publicRegisterLead'
    ])
    expect(keys).not.toContain(
      'compliance.components.success.statementLinkLead'
    )
    expect(keys).not.toContain(
      'compliance.components.success.viewStatementButton'
    )
  })

  test('places dynamic compliance status keys with the status section', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/cso/statement-view/index',
      localeBase: 'compliance.statementView',
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.statementView.components.page.preHeader',
      'compliance.statementView.components.complianceStatus.heading',
      'compliance.statementView.components.complianceStatus.obligationsMetCompliedStrapline',
      'compliance.statementView.components.complianceStatus.obligationsMetCompliedSubtext',
      'compliance.statementView.components.page.verifiedByPrefix',
      'compliance.statementView.components.page.downloadPdfButton',
      'compliance.statementView.components.page.returnButton'
    ])
  })

  test('keeps shared layout header keys before footer keys', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'layouts/page.njk',
      localeBase: null,
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'common.serviceName',
      'common.nav.menu',
      'common.phaseBanner.lead',
      'common.languageSwitcher.label',
      'common.nav.back',
      'common.footer.getHelp',
      'common.footer.crownCopyright'
    ])
  })

  test('keeps certificate view caption before summary list field keys', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/producer/certificate-view/index',
      localeBase: 'compliance.certificateView',
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.certificateView.components.page.preHeader',
      'compliance.certificateView.heading',
      'compliance.components.summaryList.heading',
      'compliance.components.summaryList.organisationName',
      'compliance.components.summaryList.submissionDate',
      'compliance.components.overallStatus.recyclingObligationsStatusHeading'
    ])
  })

  test('builds page groups from a page matrix', async () => {
    const groups = await buildPageTranslationGroups({
      englishTranslations: {
        cookies: {
          pageTitle: 'Cookies',
          heading: 'Cookies'
        },
        common: {
          serviceName: 'Report packaging data'
        }
      },
      welshTranslations: {
        cookies: {
          pageTitle: 'Cwcis',
          heading: 'Cookies'
        },
        common: {
          serviceName: 'Report packaging data'
        }
      },
      pageMatrix: {
        pages: {
          cookies: {
            route: '/cookies',
            template: 'cookies/index',
            localeBase: 'cookies',
            figmaUrl: 'https://www.figma.com/example',
            notes: 'Cookies page'
          }
        }
      },
      projectRoot
    })

    expect(groups).toMatchObject([
      {
        id: 'cookies',
        route: '/cookies',
        rows: [
          {
            translationKey: 'cookies.pageTitle',
            english: 'Cookies',
            welsh: 'Cwcis',
            figmaUrl: 'https://www.figma.com/example'
          },
          {
            translationKey: 'cookies.heading',
            english: 'Cookies',
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

  test('keeps workbook rows in page usage order rather than en.json order', async () => {
    const groups = await buildPageTranslationGroups({
      englishTranslations: {
        compliance: {
          certificateSubmit: {
            pageTitle: 'Check and submit',
            heading: 'Check and submit heading'
          },
          components: {
            regulatorInset: {
              insetLead: 'Contact the regulator'
            },
            summaryList: {
              heading: 'Organisation details',
              organisationName: 'Organisation name'
            },
            declaration: {
              heading: 'Declaration',
              intro: 'By submitting',
              fullNameLabel: 'Full name',
              submitButton: 'Submit',
              cancelLink: 'Cancel'
            }
          }
        },
        common: {
          errorSummary: {
            title: 'There is a problem'
          }
        }
      },
      welshTranslations: {},
      pageMatrix: {
        pages: {
          'producer-certificate-submit': {
            fileName: '07-producer-certificate-submit.xlsx',
            template: 'compliance/producer/certificate-submit/index',
            localeBase: 'compliance.certificateSubmit',
            notes: 'Check and submit certificate page'
          }
        }
      },
      projectRoot
    })

    const keys = groups[0].rows.map((row) => row.translationKey)

    expectKeysInOrder(keys, [
      'compliance.certificateSubmit.heading',
      'compliance.components.regulatorInset.insetLead',
      'compliance.components.summaryList.heading',
      'compliance.components.summaryList.organisationName',
      'compliance.components.declaration.heading',
      'compliance.components.declaration.intro'
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

    expect(missing).toEqual([
      'prns.list.table.number',
      'prns.list.table.type',
      'prns.list.table.status',
      'prns.list.table.material',
      'prns.list.table.tonnage',
      'prns.list.table.issuedAt',
      'prns.list.table.issuer',
      'prns.list.table.view',
      'prns.list.table.viewHiddenText'
    ])
  })

  test('orders localeBase keys before template keys before prefixes', async () => {
    const englishTranslations = {
      compliance: {
        certificateSubmit: {
          pageTitle: 'Page title',
          heading: 'Heading'
        },
        components: {
          declaration: {
            heading: 'Declaration'
          }
        },
        validation: {
          fullName: {
            empty: 'Enter your name'
          }
        }
      },
      common: {
        errorSummary: {
          title: 'There is a problem'
        }
      }
    }
    const englishKeys = flattenTranslations(englishTranslations).map(
      ({ key }) => key
    )

    const keys = await getPageTranslationKeys({
      page: {
        template: 'compliance/producer/certificate-submit/index',
        localeBase: 'compliance.certificateSubmit',
        translationKeys: [],
        translationKeyPrefixes: ['compliance.validation.fullName']
      },
      englishTranslations,
      englishKeys,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.certificateSubmit.pageTitle',
      'compliance.certificateSubmit.heading',
      'compliance.components.declaration.heading',
      'compliance.validation.fullName.empty'
    ])
  })

  test('includes explicit translationKeys after template discovery', async () => {
    const englishTranslations = {
      compliance: {
        certificateSuccess: {
          pageTitle: 'Submitted',
          panelTitle: 'Submitted panel',
          components: {
            success: {
              confirmationEmail: 'Page confirmation email {{userEmail}}'
            }
          }
        },
        components: {
          success: {
            whatHappensNext: 'What happens next',
            confirmationEmail: 'Shared confirmation email',
            certificateLinkLead: 'Lead',
            manageObligationsLink: 'Manage',
            certificateLinkSuffix: 'Suffix',
            regulatorMayAsk: 'May ask',
            regulatorBullet1: 'Bullet 1',
            regulatorBullet2: 'Bullet 2',
            publicRegisterLead: 'Public lead',
            publicRegisterLink: 'Public link',
            resubmitLead: 'Resubmit',
            returnLink: 'Return',
            viewCertificateButton: 'View certificate'
          }
        }
      },
      common: {
        opensInNewTab: 'opens in new tab'
      }
    }
    const englishKeys = flattenTranslations(englishTranslations).map(
      ({ key }) => key
    )

    const keys = await getPageTranslationKeys({
      page: {
        template: 'compliance/producer/certificate-success/index',
        localeBase: 'compliance.certificateSuccess',
        translationKeys: ['compliance.components.success.confirmationEmail'],
        translationKeyPrefixes: []
      },
      englishTranslations,
      englishKeys,
      projectRoot
    })

    expect(keys).toContain('compliance.components.success.confirmationEmail')
    expect(
      keys.indexOf('compliance.components.success.viewCertificateButton')
    ).toBeLessThan(
      keys.indexOf('compliance.components.success.confirmationEmail')
    )
  })

  test('keeps summary list heading before field labels from child sets', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/producer/certificate-submit/index',
      localeBase: 'compliance.certificateSubmit',
      englishTranslations,
      projectRoot
    })

    expectKeysInOrder(keys, [
      'compliance.components.regulatorInset.insetLead',
      'compliance.components.summaryList.heading',
      'compliance.components.summaryList.organisationName',
      'compliance.components.summaryList.regulator',
      'compliance.components.obligationsTable.recyclingObligationsHeading',
      'compliance.components.declaration.heading'
    ])
  })

  test('extracts statement success keys without certificate-only success keys', async () => {
    const englishTranslations = await readJsonFile(
      path.join(projectRoot, 'src/server/locales/en.json')
    )
    const keys = await extractTemplateTranslationKeys({
      template: 'compliance/cso/statement-success/index',
      localeBase: 'compliance.statementSuccess',
      englishTranslations,
      projectRoot
    })

    expect(keys).toContain('compliance.components.success.statementLinkLead')
    expect(keys).toContain('compliance.components.success.viewStatementButton')
    expect(keys).not.toContain(
      'compliance.components.success.certificateLinkLead'
    )
    expect(keys).not.toContain(
      'compliance.components.success.viewCertificateButton'
    )
  })

  test('splits success-page ownership across certificate and statement workbooks', async () => {
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
    const keysById = Object.fromEntries(
      groups.map((group) => [
        group.id,
        group.rows.map((row) => row.translationKey)
      ])
    )

    expect(keysById).not.toHaveProperty('about')
    expect(keysById).not.toHaveProperty('home')
    expect(keysById).not.toHaveProperty('csoc-regulators')
    expect(keysById['producer-certificate-start']).toEqual(
      expect.arrayContaining([
        'compliance.regulators.GB-ENG.the',
        'compliance.regulators.GB-WLS.the'
      ])
    )
    expect(keysById['shared-layout']).not.toContain('common.regulation43Text')
    expect(keysById['cso-statement-start']).toContain('common.regulation43Text')
    expectKeysInOrder(keysById['cso-statement-start'], [
      'compliance.components.about.introPrefix',
      'common.regulation43Text',
      'compliance.components.about.introSuffix'
    ])
    expect(keysById['producer-certificate-success']).toContain(
      'compliance.components.success.confirmationEmail'
    )
    expect(keysById['producer-certificate-success']).toContain(
      'compliance.certificateSuccess.components.success.confirmationEmail'
    )
    expect(keysById['producer-certificate-success']).not.toContain(
      'compliance.components.success.statementLinkLead'
    )
    expect(keysById['producer-certificate-success']).not.toContain(
      'compliance.components.success.viewStatementButton'
    )
    expect(keysById['cso-statement-success']).toContain(
      'compliance.components.success.statementLinkLead'
    )
    expect(keysById['cso-statement-success']).toContain(
      'compliance.components.success.viewStatementButton'
    )
    expect(keysById['cso-statement-success']).not.toContain(
      'compliance.components.success.confirmationEmail'
    )
  })

  test('places statement-view status keys before verified-by and actions', async () => {
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
    const keys = groups
      .find((group) => group.id === 'cso-statement-view')
      .rows.map((row) => row.translationKey)

    expectKeysInOrder(keys, [
      'compliance.statementView.components.complianceStatus.heading',
      'compliance.statementView.components.complianceStatus.obligationsMetCompliedStrapline',
      'compliance.statementView.components.complianceStatus.obligationsNotMetReg43NotCompliedSubtext',
      'compliance.statementView.components.page.verifiedByPrefix',
      'compliance.statementView.components.page.returnButton'
    ])
  })
})
