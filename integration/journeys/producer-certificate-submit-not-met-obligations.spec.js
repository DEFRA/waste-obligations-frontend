import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_NOT_MET_ORGANISATION_ID,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate submit not met obligations', () => {
  test('shows not met recycling obligations on the submit page', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const organisationId = PRODUCER_NOT_MET_ORGANISATION_ID
    const certificateAboutUrl = `${producerCertificatePath(organisationId)}?year=${year}`
    const submitUrl = `${producerCertificatePath(organisationId, '/submit')}?year=${year}`

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
