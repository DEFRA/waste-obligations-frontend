import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID,
  PRODUCER_ALREADY_SUBMITTED_ORGANISATION_ID,
  PRODUCER_ALREADY_SUBMITTED_SUBMITTER_NAME,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate already submitted', () => {
  test('shows already submitted on the about page and redirects submit to view', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const organisationId = PRODUCER_ALREADY_SUBMITTED_ORGANISATION_ID
    const certificateAboutUrl = `${producerCertificatePath(organisationId)}?year=${year}`
    const submitUrl = `${producerCertificatePath(organisationId, '/submit')}?year=${year}`
    const viewUrl = `${producerCertificatePath(organisationId, `/${PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID}`)}`

    await visitAuthenticatedPath(page, certificateAboutUrl)

    await expect(page).toHaveTitle(/About your 2026 certificate of compliance/)
    await expect(
      page.getByText(
        'You have already submitted your certificate of compliance for 2026.'
      )
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0)

    await visitAuthenticatedPath(page, submitUrl, { expectExactPath: false })
    await expect(page).toHaveURL(new RegExp(`${viewUrl}$`))
    await expect(page).toHaveTitle(/2026 certificate of compliance/)
    await expect(
      page.getByRole('heading', {
        name: '2026 certificate of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(PRODUCER_ALREADY_SUBMITTED_SUBMITTER_NAME)
    ).toBeVisible()
  })
})
