import { describe, expect, test } from 'vitest'

import { certificateObligationStatusI18nKey } from './certificate-obligation-status.js'

describe('certificateObligationStatusI18nKey', () => {
  test('returns met key when obligations are met', () => {
    expect(
      certificateObligationStatusI18nKey({ obligationStatus: 'Met' })
    ).toBe('compliance.components.success.publicRegisterBullet1Met')
  })

  test('returns not met key when obligations are not met', () => {
    expect(
      certificateObligationStatusI18nKey({ obligationStatus: 'NotMet' })
    ).toBe('compliance.components.success.publicRegisterBullet1NotMet')
  })
})
