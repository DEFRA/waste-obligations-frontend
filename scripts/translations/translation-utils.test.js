import { describe, expect, test } from 'vitest'
import {
  buildTranslationRows,
  buildWelshTranslations,
  findParentKey,
  flattenTranslations
} from './translation-utils.js'

describe('translation utils', () => {
  test('flattens nested translation strings', () => {
    expect(flattenTranslations({
      compliance: {
        certificate: {
          heading: 'About your certificate',
          count: 1
        }
      }
    })).toEqual([
      {
        key: 'compliance.certificate.heading',
        value: 'About your certificate'
      }
    ])
  })

  test('finds the nearest parent key in the page matrix', () => {
    expect(findParentKey('compliance.certificateSubmit.material.glass', {
      'compliance.certificateSubmit': {},
      'compliance.certificateSubmit.material': {}
    })).toBe('compliance.certificateSubmit.material')
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
})
