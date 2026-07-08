import { expect, test } from '@playwright/test'

import {
  PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID,
  PRODUCER_ALREADY_SUBMITTED_SUBMITTER_NAME,
  PRODUCER_ALREADY_SUBMITTED_YEAR,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate already submitted', () => {
  test('shows already submitted on the about page and redirects submit to view', async ({
    page
  }) => {
    const year = PRODUCER_ALREADY_SUBMITTED_YEAR
    const certificateAboutUrl = `${producerCertificatePath()}?year=${year}`
    const submitUrl = `${producerCertificatePath('/submit')}?year=${year}`
    const viewUrl = `${producerCertificatePath(`/${PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID}`)}`

    await visitAuthenticatedPath(page, certificateAboutUrl)

    await expect(page).toHaveTitle(/About your 2025 certificate of compliance/)
    await expect(
      page.getByText(
        'You have already submitted your certificate of compliance for 2025.'
      )
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0)

    await visitAuthenticatedPath(page, submitUrl, { expectExactPath: false })
    await expect(page).toHaveURL(new RegExp(`${viewUrl}$`))
    await expect(page).toHaveTitle(/2025 certificate of compliance/)
    await expect(
      page.getByRole('heading', {
        name: '2025 certificate of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(PRODUCER_ALREADY_SUBMITTED_SUBMITTER_NAME)
    ).toBeVisible()
  })
})
