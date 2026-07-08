import { expect, test } from '@playwright/test'

import {
  PRODUCER_OBLIGATION_YEAR,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate submit validation', () => {
  test('shows a validation error when full name is missing', async ({
    page
  }) => {
    const year = PRODUCER_OBLIGATION_YEAR
    const certificateAboutUrl = `${producerCertificatePath()}?year=${year}`
    const submitUrl = `${producerCertificatePath('/submit')}?year=${year}`

    await visitAuthenticatedPath(page, certificateAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )
    await expect(page.locator('#fullName-error')).toContainText(
      'You must enter your full name'
    )
  })
})
