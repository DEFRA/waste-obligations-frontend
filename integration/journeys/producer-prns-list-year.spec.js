import { expect, test } from '../fixtures/test.js'

import { INTEGRATION_OBLIGATION_YEAR } from '../fixtures/shared.js'
import {
  producerObligationsPath,
  producerPrnsPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// The integration clock starts on 15 Dec 2026, inside the December waste
// window. The API owns the year rule, so the stubs answer per
// `acceptableIntoYear`:
//   2026: PRN001 to PRN004
//   2027: only the December waste note PRN004
const YEAR = INTEGRATION_OBLIGATION_YEAR
const NEXT_YEAR = YEAR + 1

function listHeading(page, year) {
  return page.getByRole('heading', {
    name: `Accept or reject PRNs and PERNs for ${year}`,
    exact: true,
    level: 1
  })
}

async function readAwaitingCount(page) {
  const figure = page
    .locator('.govuk-inset-text')
    .filter({ hasText: /awaiting acceptance/i })
    .locator('p.govuk-body-l')
  await expect(figure).toBeVisible()
  return Number((await figure.textContent()).trim())
}

test.describe('Producer PRNs list is filtered by year', () => {
  test('lists every note that can be accepted into the year and no others', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${producerPrnsPath()}?year=${YEAR}`)

    await expect(listHeading(page, YEAR)).toBeVisible()
    for (const number of ['PRN001', 'PRN002', 'PRN003', 'PRN004']) {
      await expect(page.getByRole('link', { name: number })).toHaveCount(1)
    }
    await expect(page.getByText('Showing 1 to 4 of 4')).toBeVisible()

    await visitAuthenticatedPath(
      page,
      `${producerPrnsPath()}?year=${NEXT_YEAR}`
    )

    await expect(listHeading(page, NEXT_YEAR)).toBeVisible()
    await expect(page.getByRole('link', { name: 'PRN004' })).toBeVisible()
    for (const number of ['PRN001', 'PRN002', 'PRN003']) {
      await expect(page.getByRole('link', { name: number })).toHaveCount(0)
    }
    await expect(page.getByText('Showing 1 to 1 of 1')).toBeVisible()
  })

  test('the obligations page count matches the list for each year', async ({
    page
  }) => {
    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}?year=${YEAR}`
    )
    expect(await readAwaitingCount(page)).toBe(4)

    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}?year=${NEXT_YEAR}`
    )
    expect(await readAwaitingCount(page)).toBe(1)
  })

  test('without a year the list is for the current compliance year', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, producerPrnsPath())

    await expect(listHeading(page, YEAR)).toBeVisible()
    await expect(page.getByText('Showing 1 to 4 of 4')).toBeVisible()
  })

  test('a page past the last shows the last page', async ({ page }) => {
    // The server redirects to the last page, so the requested URL isn't where we land.
    await visitAuthenticatedPath(
      page,
      `${producerPrnsPath()}?year=${YEAR}&pageSize=1&page=99`,
      { expectExactPath: false }
    )

    await expect(page).toHaveURL(/[?&]page=4(&|$)/)
    await expect(listHeading(page, YEAR)).toBeVisible()
    await expect(page.getByText('Showing 4 to 4 of 4')).toBeVisible()
    await expect(page.getByRole('link', { name: 'PRN004' })).toBeVisible()
  })
})
