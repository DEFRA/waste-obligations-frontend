import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer certificate back navigation', () => {
  test('back link returns to the previous page and does not loop', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const certificateAboutUrl = `${producerCertificatePath()}?year=${year}`
    const submitUrl = `${producerCertificatePath('/submit')}?year=${year}`
    const certificateAboutHref = new RegExp(
      `${certificateAboutUrl.replace('?', '\\?')}$`
    )
    const submitHref = new RegExp(`${submitUrl.replace('?', '\\?')}$`)

    await visitAuthenticatedPath(page, certificateAboutUrl)

    await expect(page).toHaveTitle(/About your 2026 certificate of compliance/)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(submitHref)

    const backLink = page.getByRole('link', { name: 'Back', exact: true })
    await expect(backLink).toHaveAttribute('href', certificateAboutHref)

    await backLink.click()
    await expect(page).toHaveURL(certificateAboutHref)

    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).not.toHaveAttribute('href', submitHref)
  })
})
