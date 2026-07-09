import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_SUBMIT_FAILURE_FULL_NAME,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate submit failure', () => {
  test('shows the technical error page when the obligations API cannot save the declaration', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const certificateAboutUrl = `${producerCertificatePath()}?year=${year}`
    const submitUrl = `${producerCertificatePath('/submit')}?year=${year}`

    await visitAuthenticatedPath(page, certificateAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await page
      .getByLabel('Your full name')
      .fill(PRODUCER_SUBMIT_FAILURE_FULL_NAME)
    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )
    await expect(
      page.getByRole('heading', {
        name: 'Sorry, there has been a technical error',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        'Your certificate of compliance may not have been submitted.'
      )
    ).toBeVisible()
    await expect(
      page.getByText(
        'Check your email inbox for confirmation. If you have not received a confirmation email, you will need to submit your certificate again.'
      )
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'homepage' })).toBeVisible()
  })
})
