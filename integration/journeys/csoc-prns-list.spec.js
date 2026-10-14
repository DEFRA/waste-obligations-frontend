import { expect, test } from '../fixtures/test.js'

import {
  CSOC_AWAITING_ACCEPTANCE_PRN_ID,
  CSOC_COMPLIANCE_SCHEME_ID,
  CSOC_DECEMBER_WASTE_PRN_ID,
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
    const checkSelectionUrl = `${csoPrnsPath()}/check-selection?year=${year}`

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
    await expect(page.getByRole('checkbox')).toHaveCount(1)
    await expect(page.getByRole('link', { name: 'PRN101' })).toHaveAttribute(
      'href',
      new RegExp(
        `/cso/${CSOC_COMPLIANCE_SCHEME_ID}/prns/${CSOC_AWAITING_ACCEPTANCE_PRN_ID}\\?year=${year}$`
      )
    )
    await expect(page.getByText('Steel Recyclers').first()).toBeVisible()
    await expect(page.getByText('Showing 1 to 2 of 2')).toBeVisible()
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

    await expect(page).toHaveURL(
      new RegExp(`${checkSelectionUrl.replace('?', '\\?')}$`)
    )
    await expect(page).toHaveTitle(/Check your selection before accepting/)

    const steelTable = page.getByRole('table', { name: 'Steel' })
    await expect(steelTable).toBeVisible()
    await expect(
      steelTable.getByRole('row', {
        name: /PRN101 01 Jul 2026 Steel Recyclers 10/
      })
    ).toBeVisible()
    await expect(
      steelTable.getByRole('row', { name: /^Total 10/ })
    ).toBeVisible()

    await page.getByRole('link', { name: 'PRN101' }).click()
    await expect(page).toHaveURL(new RegExp(`${prnUrl.replace('?', '\\?')}$`))
    await expect(
      page.getByRole('heading', { name: 'Packaging recycling note', level: 1 })
    ).toBeVisible()
    await expect(page.getByText('PRN101')).toBeVisible()

    // The PRN detail page's Back link should return to the review page the
    // user actually came from, not skip past it to the full list.
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute(
      'href',
      new RegExp(`${checkSelectionUrl.replace('?', '\\?')}$`)
    )
  })

  // STARTUP_UTC_TIMESTAMP_OVERRIDE starts the server's UI clock at 15 Dec 2026, inside
  // the flash window for PRN102. Which PRNs flash at which dates is covered by
  // the available-acceptance-years and rendered-route tests; this journey checks
  // the rendered label, row styling and checkbox behaviour in the browser.
  test('shows the December waste flash on the list and the PRN page', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    await visitAuthenticatedPath(page, `${csoPrnsPath()}?year=${year}`)

    const rowFor = (number) =>
      page
        .getByRole('row')
        .filter({ has: page.getByRole('link', { name: number, exact: true }) })
    const flashRow = rowFor('PRN102')
    const flashLabel = flashRow.getByTestId('december-waste-label')

    await expect(flashLabel).toHaveText('Can be accepted towards 2026 or 2027')
    await expect(flashLabel).toHaveClass(/flash-container--blue/)
    const flashCells = await flashRow.getByRole('cell').all()
    expect(flashCells.length).toBeGreaterThan(0)
    for (const cell of flashCells) {
      await expect(cell).toHaveClass(/december-waste-flash-row/)
    }
    // A two-year choice can't be accepted in bulk, so it has no checkbox.
    await expect(flashRow.getByRole('checkbox')).toHaveCount(0)

    const standardRow = rowFor('PRN101')
    await expect(standardRow.getByTestId('december-waste-label')).toHaveCount(0)
    await expect(standardRow.getByRole('cell').first()).not.toHaveClass(
      /december-waste-flash-row/
    )
    await expect(standardRow.getByRole('checkbox')).toHaveCount(1)

    await flashRow.getByRole('link', { name: 'PRN102', exact: true }).click()

    await expect(page).toHaveURL(
      new RegExp(
        `/cso/${CSOC_COMPLIANCE_SCHEME_ID}/prns/${CSOC_DECEMBER_WASTE_PRN_ID}\\?year=${year}$`
      )
    )
    const pageLabel = page.getByTestId('december-waste-label')
    await expect(pageLabel).toHaveText('Can be accepted towards 2026 or 2027')
    await expect(pageLabel).toHaveClass(/flash-container--blue/)
  })
})
