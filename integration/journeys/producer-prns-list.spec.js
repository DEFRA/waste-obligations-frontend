import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  PRODUCER_ORGANISATION_ID,
  producerObligationsPath,
  producerPrnPath,
  producerPrnsPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer PRNs list', () => {
  test('opens from manage obligations, lists awaiting-acceptance notes, and links to the PRN', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${producerObligationsPath()}?year=${year}`
    const listUrl = `${producerPrnsPath()}?year=${year}`
    const prnUrl = `${producerPrnPath(PRODUCER_AWAITING_ACCEPTANCE_PRN_ID)}?year=${year}`

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
    await expect(
      page.getByRole('columnheader', { name: 'Material' })
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'Date issued' })
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'December waste' })
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'Issued by' })
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'Tonnage' })
    ).toBeVisible()
    await expect(
      page.getByRole('columnheader', { name: 'Issuer note' })
    ).toBeVisible()

    await expect(page.getByRole('checkbox')).toHaveCount(3)
    await expect(page.getByRole('link', { name: 'PRN001' })).toHaveAttribute(
      'href',
      new RegExp(
        `/producer/${PRODUCER_ORGANISATION_ID}/prns/${PRODUCER_AWAITING_ACCEPTANCE_PRN_ID}\\?year=${year}$`
      )
    )
    await expect(page.getByText('Reprocessor Ltd')).toBeVisible()
    await expect(page.getByText('Not provided')).toBeVisible()
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
    await expect(page).toHaveTitle(/Accept or reject PRNs and PERNs/)
    await expect(page).not.toHaveTitle(/Error:/)

    await page.getByRole('link', { name: 'PRN001' }).click()
    await expect(page).toHaveURL(new RegExp(`${prnUrl.replace('?', '\\?')}$`))
    await expect(
      page.getByRole('heading', { name: 'Packaging recycling note', level: 1 })
    ).toBeVisible()
    await expect(page.getByText('PRN001')).toBeVisible()
  })

  // Changing the sort/material selects auto-submits a full-page GET, which
  // would otherwise drop focus to the top of the reloaded document.
  test('keeps focus on the sort select after changing it reloads the page', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const listUrl = `${producerPrnsPath()}?year=${year}`

    await visitAuthenticatedPath(page, listUrl)

    const sortSelect = page.getByLabel('Sort by')

    await Promise.all([
      page.waitForURL(/[?&]sort=TonnageDescending(&|$)/),
      sortSelect.selectOption({ label: 'Tonnage: (heaviest first)' })
    ])

    await expect(sortSelect).toBeFocused()
  })

  // On a real browser, arrow keys change a focused, closed native select
  // immediately without opening it, so each change here auto-submits its own
  // reload; a keyboard user must be able to keep adjusting their choice
  // across those reloads without losing focus. Headless Chromium doesn't
  // render that native listbox interaction, so arrow-key presses on the
  // select are a no-op here (confirmed directly: neither `locator.press`
  // nor `page.keyboard` change its value in this environment) - Playwright's
  // own recommended, cross-browser-reliable way to change a select's value
  // is `selectOption`, used below. What this test can and does verify is the
  // part that matters for the keyboard user once their choice registers: the
  // already-focused select survives two changes in a row, each triggering
  // its own full-page reload, rather than losing focus after the first one.
  test('keyboard users can finish selecting a sort option across reloads without losing focus', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const listUrl = `${producerPrnsPath()}?year=${year}`

    await visitAuthenticatedPath(page, listUrl)

    const sortSelect = page.getByLabel('Sort by')
    await sortSelect.focus()

    await Promise.all([
      page.waitForURL(/[?&]sort=TonnageDescending(&|$)/),
      sortSelect.selectOption({ label: 'Tonnage: (heaviest first)' })
    ])
    await expect(sortSelect).toBeFocused()

    await Promise.all([
      page.waitForURL(/[?&]sort=MaterialAscending(&|$)/),
      sortSelect.selectOption({ label: 'Material (A to Z)' })
    ])
    await expect(sortSelect).toBeFocused()
  })

  // Mirrors the sort test above for the material filter select.
  test('keyboard users can finish selecting a material filter across reloads without losing focus', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const listUrl = `${producerPrnsPath()}?year=${year}`

    await visitAuthenticatedPath(page, listUrl)

    const materialSelect = page.getByLabel('Filter by')
    await materialSelect.focus()

    await Promise.all([
      page.waitForURL(/[?&]material=Plastic(&|$)/),
      materialSelect.selectOption({ label: 'Plastic' })
    ])
    await expect(materialSelect).toBeFocused()

    await Promise.all([
      page.waitForURL(/[?&]material=Aluminium(&|$)/),
      materialSelect.selectOption({ label: 'Aluminium' })
    ])
    await expect(materialSelect).toBeFocused()
  })
})
