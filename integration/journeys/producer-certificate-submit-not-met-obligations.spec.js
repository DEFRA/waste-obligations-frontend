import { expect, test } from '@playwright/test'

import {
  PRODUCER_NOT_MET_OBLIGATIONS_YEAR,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate submit not met obligations', () => {
  test('shows not met recycling obligations on the submit page', async ({
    page
  }) => {
    const year = PRODUCER_NOT_MET_OBLIGATIONS_YEAR
    const certificateAboutUrl = `${producerCertificatePath()}?year=${year}`
    const submitUrl = `${producerCertificatePath('/submit')}?year=${year}`

    await visitAuthenticatedPath(page, certificateAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await expect(
      page.getByText('Recycling obligations have not been met')
    ).toBeVisible()
  })
})
