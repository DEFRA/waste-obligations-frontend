import { expect, test } from '../fixtures/test.js'

import { INTEGRATION_OBLIGATION_YEAR } from '../fixtures/shared.js'
import { csoObligationsPath, csoPrnsPath } from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// The integration clock starts on 15 Dec 2026, inside the December waste
// window. The stubbed awaiting-acceptance list holds one standard 2026 note
// (PRN101) and one December waste 2026 note (PRN102), so:
//   2026: both are acceptable into 2026
//   2027: only the December waste note can also be accepted into 2027
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

test.describe('CSO PRNs list is filtered by year', () => {
  test('lists every note that can be accepted into the year and no others', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${csoPrnsPath()}?year=${YEAR}`)

    await expect(listHeading(page, YEAR)).toBeVisible()
    for (const number of ['PRN101', 'PRN102']) {
      await expect(page.getByRole('link', { name: number })).toHaveCount(1)
    }
    await expect(page.getByText('Showing 1 to 2 of 2')).toBeVisible()

    await visitAuthenticatedPath(page, `${csoPrnsPath()}?year=${NEXT_YEAR}`)

    await expect(listHeading(page, NEXT_YEAR)).toBeVisible()
    await expect(page.getByRole('link', { name: 'PRN102' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'PRN101' })).toHaveCount(0)
    await expect(page.getByText('Showing 1 to 1 of 1')).toBeVisible()
  })

  test('the obligations page count matches the list for each year', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${csoObligationsPath()}?year=${YEAR}`)
    expect(await readAwaitingCount(page)).toBe(2)

    await visitAuthenticatedPath(
      page,
      `${csoObligationsPath()}?year=${NEXT_YEAR}`
    )
    expect(await readAwaitingCount(page)).toBe(1)
  })

  test('without a year the list is for the current compliance year', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, csoPrnsPath())

    await expect(listHeading(page, YEAR)).toBeVisible()
    await expect(page.getByText('Showing 1 to 2 of 2')).toBeVisible()
  })

  test('a page past the last shows the last page', async ({ page }) => {
    await visitAuthenticatedPath(
      page,
      `${csoPrnsPath()}?year=${YEAR}&pageSize=1&page=99`,
      { expectExactPath: false }
    )

    await expect(page).toHaveURL(/[?&]page=2(&|$)/)
    await expect(listHeading(page, YEAR)).toBeVisible()
    await expect(page.getByText('Showing 2 to 2 of 2')).toBeVisible()
    await expect(page.getByRole('link', { name: 'PRN102' })).toBeVisible()
  })
})
