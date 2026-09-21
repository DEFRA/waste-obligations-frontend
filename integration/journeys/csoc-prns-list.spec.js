import { expect, test } from '../fixtures/test.js'

import {
  CSOC_AWAITING_ACCEPTANCE_PRN_ID,
  CSOC_COMPLIANCE_SCHEME_ID,
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
        name: 'Accept or reject PRNs and PERNs',
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
    await expect(page.getByText('Steel Recyclers')).toBeVisible()
    await expect(page.getByText('Showing 1 to 1 of 1')).toBeVisible()
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

    await page.getByRole('checkbox').check()
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
})
