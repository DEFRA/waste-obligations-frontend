import { expect, test } from '../fixtures/test.js'

import {
  CSOC_AWAITING_ACCEPTANCE_PRN_ID,
  CSOC_COMPLIANCE_SCHEME_ID,
  CSOC_DECEMBER_WASTE_PRN_ID,
  CSOC_STALE_DECEMBER_WASTE_PRN_ID,
  CSOC_ACCEPTED_DECEMBER_WASTE_PRN_ID,
  INTEGRATION_OBLIGATION_YEAR,
  csoObligationsPath,
  csoPrnPath,
  csoPrnsPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC PRNs list', () => {
  test('opens from manage obligations, lists awaiting-acceptance notes, and links to the PRN', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${csoObligationsPath()}?year=${year}`
    const listUrl = `${csoPrnsPath()}?year=${year}`
    const prnUrl = `${csoPrnPath(CSOC_AWAITING_ACCEPTANCE_PRN_ID)}?year=${year}`

    await visitAuthenticatedPath(page, obligationsUrl)

    await page
      .getByRole('link', {
        name: 'Accept or reject PRNs and PERNs',
        exact: true
      })
      .click()

    await expect(page).toHaveURL(new RegExp(`${listUrl.replace('?', '\\?')}$`))
    await expect(page).toHaveTitle(/Accept or reject PRNs and PERNs/)
    await expect(
      page.getByRole('heading', {
        name: `Accept or reject PRNs and PERNs for ${year}`,
        exact: true,
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        "Select the PRNs or PERNs you want to accept. You can also review each one by opening it and selecting 'accept' or 'reject'."
      )
    ).toBeVisible()

    await expect(
      page.getByRole('columnheader', { name: 'PRN or PERN number' })
    ).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(2)
    await expect(page.getByRole('link', { name: 'PRN101' })).toHaveAttribute(
      'href',
      new RegExp(
        `/cso/${CSOC_COMPLIANCE_SCHEME_ID}/prns/${CSOC_AWAITING_ACCEPTANCE_PRN_ID}\\?year=${year}$`
      )
    )
    await expect(page.getByText('Steel Recyclers').first()).toBeVisible()
    await expect(page.getByText('Showing 1 to 3 of 3')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Accept selected PRNs and PERNs' })
    ).toBeVisible()

    await page
      .getByRole('button', { name: 'Accept selected PRNs and PERNs' })
      .click()

    await expect(page).toHaveTitle(/Error: Accept or reject PRNs and PERNs/)
    await expect(page.getByRole('alert')).toContainText('There is a problem')
    await expect(
      page.getByRole('link', {
        name: 'To accept multiple PRNs or PERNs select one or more using the check boxes'
      })
    ).toBeVisible()

    await page.getByRole('checkbox').first().check()
    await page
      .getByRole('button', { name: 'Accept selected PRNs and PERNs' })
      .click()

    await expect(page.getByRole('alert')).toHaveCount(0)

    await page.getByRole('link', { name: 'PRN101' }).click()
    await expect(page).toHaveURL(new RegExp(`${prnUrl.replace('?', '\\?')}$`))
    await expect(
      page.getByRole('heading', { name: 'Packaging recycling note', level: 1 })
    ).toBeVisible()
    await expect(page.getByText('PRN101')).toBeVisible()
  })

  // The integration server's clock is frozen at 15 Dec 2026 (DECEMBER_WASTE_FLASH_DATE), inside
  // the December waste flash window for PRNs issued in December 2026.
  test('flags only the December waste PRN issued this window on the list', async ({
    page
  }) => {
    await visitAuthenticatedPath(
      page,
      `${csoPrnsPath()}?year=${INTEGRATION_OBLIGATION_YEAR}`
    )

    const rowFor = (number) =>
      page
        .getByRole('row')
        .filter({ has: page.getByRole('link', { name: number, exact: true }) })

    await expect(rowFor('PRN102')).toContainText(
      'Can be accepted towards 2026 or 2027'
    )
    await expect(rowFor('PRN102').getByRole('cell').first()).toHaveClass(
      /december-waste-flash-row/
    )
    // A two-year choice can't be accepted in bulk, so it has no checkbox.
    await expect(rowFor('PRN102').getByRole('checkbox')).toHaveCount(0)

    await expect(rowFor('PRN103')).not.toContainText('Can be accepted towards')
    await expect(page.getByText(/Can be accepted towards/)).toHaveCount(1)
  })

  test('shows the December waste flash on a PRN issued this window, but not on a stale or accepted one', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const flash = page.getByText(/Can be accepted towards/)

    await visitAuthenticatedPath(
      page,
      `${csoPrnPath(CSOC_DECEMBER_WASTE_PRN_ID)}?year=${year}`
    )
    await expect(page.getByText('PRN102')).toBeVisible()
    await expect(flash).toHaveText('Can be accepted towards 2026 or 2027')

    await visitAuthenticatedPath(
      page,
      `${csoPrnPath(CSOC_STALE_DECEMBER_WASTE_PRN_ID)}?year=${year}`
    )
    await expect(page.getByText('PRN103')).toBeVisible()
    await expect(flash).toHaveCount(0)

    await visitAuthenticatedPath(
      page,
      `${csoPrnPath(CSOC_ACCEPTED_DECEMBER_WASTE_PRN_ID)}?year=${year}`
    )
    await expect(page.getByText('PRN104')).toBeVisible()
    await expect(flash).toHaveCount(0)
  })
})
