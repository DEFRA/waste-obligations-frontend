import { expect, test } from '@playwright/test'

import {
  PRODUCER_ORGANISATION_NAME,
  PRODUCER_COMPLIANCE_DECLARATION_ID,
  PRODUCER_INTEGRATION_USER_EMAIL,
  PRODUCER_OBLIGATION_YEAR,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate submit journey', () => {
  test('submits a certificate and views the confirmation', async ({ page }) => {
    const year = PRODUCER_OBLIGATION_YEAR
    const certificateAboutUrl = `${producerCertificatePath()}?year=${year}`
    const submitUrl = `${producerCertificatePath('/submit')}?year=${year}`
    const successUrl = `${producerCertificatePath(`/${PRODUCER_COMPLIANCE_DECLARATION_ID}/success`)}`
    const viewUrl = `${producerCertificatePath(`/${PRODUCER_COMPLIANCE_DECLARATION_ID}`)}`

    await visitAuthenticatedPath(page, certificateAboutUrl)

    await expect(page).toHaveTitle(/About your 2026 certificate of compliance/)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await expect(page).toHaveTitle(
      /Check and submit your certificate of compliance/
    )
    await expect(
      page.getByRole('heading', {
        name: 'Check and submit your 2026 certificate of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page
        .getByRole('definition')
        .filter({ hasText: PRODUCER_ORGANISATION_NAME })
    ).toBeVisible()
    await expect(
      page.getByText('Recycling obligations have been met')
    ).toBeVisible()

    await page.getByLabel('Your full name').fill('Jane Doe')
    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(new RegExp(`${successUrl}$`))
    await expect(page).toHaveTitle(/Certificate of compliance submitted/)
    await expect(
      page.getByRole('heading', {
        name: 'You have submitted your 2026 certificate of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `We have sent a confirmation email to: ${PRODUCER_INTEGRATION_USER_EMAIL}`
      )
    ).toBeVisible()

    await page.getByRole('button', { name: 'View your certificate' }).click()
    await expect(page).toHaveURL(new RegExp(`${viewUrl}$`))
    await expect(page).toHaveTitle(/2026 certificate of compliance/)
    await expect(
      page.getByRole('heading', {
        name: '2026 certificate of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(page.getByText('Recycling obligations met')).toBeVisible()
    await expect(page.getByText('Jane Doe')).toBeVisible()
  })
})
