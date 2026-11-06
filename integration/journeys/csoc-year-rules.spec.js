import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  csoObligationsPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

const CURRENT_YEAR = INTEGRATION_OBLIGATION_YEAR
const NEXT_YEAR = CURRENT_YEAR + 1

test.describe('Compliance scheme choose a year', () => {
  test('lists the years, rejects an empty choice, and opens the chosen year', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${csoObligationsPath()}/choose-year`)

    await expect(
      page.getByRole('heading', { name: 'Choose a year', level: 1 })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(3)
    await expect(
      page.getByRole('radio', { name: String(NEXT_YEAR) })
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: '2025' })).toBeVisible()

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByRole('heading', { name: 'There is a problem' })
    ).toBeVisible()

    await page.getByRole('radio', { name: String(CURRENT_YEAR) }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByRole('heading', {
        name: `Manage your ${CURRENT_YEAR} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
  })

  test('choosing next year shows the not-calculated content with no statement card', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${csoObligationsPath()}/choose-year`)

    await page.getByRole('radio', { name: String(NEXT_YEAR) }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByText(
        `Your ${NEXT_YEAR} recycling obligations have not been calculated yet.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Submit your statement of compliance' })
    ).toHaveCount(0)
  })

  test('choosing 2025 shows the statement of compliance record', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${csoObligationsPath()}/choose-year`)

    await page.getByRole('radio', { name: '2025' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(
      page.getByRole('heading', {
        name: 'Your statement of compliance record for 2025',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        'We cannot show statements of compliance for 2025, because they were processed outside the service.'
      )
    ).toBeVisible()
  })

  test('shows the page in Welsh', async ({ page }) => {
    await visitAuthenticatedPath(
      page,
      `${csoObligationsPath()}/choose-year?lang=cy`
    )

    await expect(
      page.getByRole('heading', { name: 'Dewiswch flwyddyn', level: 1 })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Bwrw ymlaen' })
    ).toBeVisible()
  })
})

test.describe('Compliance scheme year rules', () => {
  test('2025 opens the statement of compliance record', async ({ page }) => {
    await visitAuthenticatedPath(page, `${csoObligationsPath()}?year=2025`, {
      expectExactPath: false
    })

    await expect(
      page.getByRole('heading', {
        name: 'Your statement of compliance record for 2025',
        level: 1
      })
    ).toBeVisible()
    expect(new URL(page.url()).pathname).toContain(
      '/obligations/compliance-record'
    )
  })

  test('a year beyond next year opens the current year', async ({ page }) => {
    await visitAuthenticatedPath(page, `${csoObligationsPath()}?year=2028`, {
      expectExactPath: false
    })

    await expect(
      page.getByRole('heading', {
        name: `Manage your ${CURRENT_YEAR} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
  })
})
