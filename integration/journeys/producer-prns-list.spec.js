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
})
