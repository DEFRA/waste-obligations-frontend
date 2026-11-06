import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  producerObligationsPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer choose a year', () => {
  test('asks for a year, shows an error when none is chosen, then shows that year', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR

    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}/choose-year`
    )

    await expect(page).toHaveTitle(/Choose a year/)
    await expect(
      page.getByRole('heading', { name: 'Choose a year', level: 1 })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(3)
    await expect(
      page.getByRole('radio', { name: String(year + 1) })
    ).toBeVisible()
    await expect(
      page.getByRole('radio', { name: String(year) })
    ).not.toBeChecked()
    await expect(page.getByRole('radio', { name: '2025' })).toBeVisible()

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Select a year' })
    ).toBeVisible()
    await expect(page).toHaveTitle(/Error: Choose a year/)

    await page.getByRole('radio', { name: String(year) }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByRole('heading', {
        name: `Manage your ${year} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
  })

  test('choosing 2025 shows the certificate of compliance record for 2025', async ({
    page
  }) => {
    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}/choose-year`
    )

    await page.getByRole('radio', { name: '2025' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByRole('heading', {
        name: 'Your certificate of compliance record for 2025',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText('We cannot show certificates of compliance for 2025')
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'packagingproducers@environment-agency.gov.uk'
      })
    ).toBeVisible()
  })
})
