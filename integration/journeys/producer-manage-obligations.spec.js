import { readFile } from 'node:fs/promises'

import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID,
  PRODUCER_ALREADY_SUBMITTED_ORGANISATION_ID,
  PRODUCER_ALL_NO_DATA_YET_ORGANISATION_ID,
  PRODUCER_CANCELLED_ORGANISATION_ID,
  PRODUCER_NO_DATA_YET_ORGANISATION_ID,
  PRODUCER_ORGANISATION_ID,
  PRODUCER_ORGANISATION_NAME,
  producerCertificatePath,
  producerObligationsPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer manage obligations', () => {
  test('shows the manage obligations page with progress and next steps', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${producerObligationsPath()}?year=${year}`
    const prnsUrl = `/producer/${PRODUCER_ORGANISATION_ID}/prns?year=${year}`
    const certificateUrl = `${producerCertificatePath()}?year=${year}`

    await visitAuthenticatedPath(page, obligationsUrl)

    await expect(page).toHaveTitle(/Manage your recycling obligations/)
    await expect(
      page.getByRole('heading', {
        name: `Manage your ${year} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
    await expect(page.getByText(PRODUCER_ORGANISATION_NAME)).toBeVisible()
    await expect(page.getByText('Environment Agency')).toBeVisible()
    await expect(
      page.getByText('Number of PRNs and PERNs awaiting acceptance.')
    ).toBeVisible()
    await expect(page.getByText('4', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'How to meet your recycling obligations',
        level: 2
      })
    ).toBeVisible()
    await expect(page.getByText('Plastic').first()).toBeVisible()
    await expect(page.getByText('Met').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'What to do next', level: 2 })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'Submit your certificate of compliance',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'Accept or reject PRNs and PERNs',
        exact: true
      })
    ).toHaveAttribute('href', new RegExp(prnsUrl.replace('?', '\\?')))
    await expect(
      page.getByRole('button', { name: 'Submit your certificate', exact: true })
    ).toHaveAttribute('href', new RegExp(certificateUrl.replace('?', '\\?')))
  })

  test('downloads the PRNs and PERNs of the year as a CSV from the what to do next tile', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR

    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}?year=${year}`
    )

    const downloadPromise = page.waitForEvent('download')

    await page
      .getByRole('link', {
        name: `Download a list of your PRNs and PERNs for ${year} (CSV)`
      })
      .click()

    const download = await downloadPromise

    expect(download.suggestedFilename()).toBe(`PRNDetail${year}.csv`)

    const csv = await readFile(await download.path(), 'utf8')
    const [header, ...rows] = csv.trim().split('\r\n')

    expect(header).toBe(
      'PRN or PERN number,PRN or PERN,Status,Issued by,Issued to,Accreditation number,December waste,Material,Recycling process,Tonnes,Date accepted,Date cancelled,Issuer note'
    )
    expect(rows).toEqual([
      'PRN011,PRN,Accepted,Reprocessor Ltd,Producer Integration Ltd,ACC-0011,N,Plastic,Reprocessing,50,03/05/2026,not cancelled,Accepted batch',
      'PERN012,PERN,Awaiting acceptance,Export Co,Producer Integration Ltd,ACC-0012,Y,Glass Other,Exporting,20,not accepted,not cancelled,not provided'
    ])
  })

  test('shows dashes for No data yet and 0 for a low tonnage Met material', async ({
    page
  }) => {
    const url = `${producerObligationsPath(PRODUCER_NO_DATA_YET_ORGANISATION_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    // Plastic also appears in the glass breakdown table; the main table comes first
    const plasticRow = page.getByRole('row', { name: /Plastic/ }).first()
    const woodRow = page.getByRole('row', { name: /Wood/ })
    // The glass breakdown table has its own Totals row; the main table comes first
    const totalsRow = page.getByRole('row', { name: /Totals/ }).first()

    for (const column of [0, 3]) {
      const cell = plasticRow.getByRole('cell').nth(column)

      await expect(cell).toContainText('Not available yet')
      await expect(cell.locator('[aria-hidden="true"]')).toHaveText('-')
    }
    await expect(plasticRow).toContainText('No data yet')

    await expect(woodRow.getByRole('cell').nth(0)).toHaveText('0')
    await expect(woodRow.getByRole('cell').nth(3)).toHaveText('0')
    await expect(woodRow).toContainText('Met')

    // A group with some data sums it, so Totals shows 0 here, not a dash
    await expect(totalsRow.getByRole('cell').nth(0)).toHaveText('0')
    await expect(totalsRow.getByRole('cell').nth(3)).toHaveText('0')
  })

  test('shows the alternative How to meet content when no obligations have been calculated', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const url = `${producerObligationsPath(PRODUCER_ALL_NO_DATA_YET_ORGANISATION_ID)}?year=${year}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'How to meet your recycling obligations',
        level: 2
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `Your ${year} recycling obligations have not been calculated yet. They will be calculated after:`,
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      page.getByText(`you submit your packaging data for ${year - 1}`, {
        exact: true
      })
    ).toBeVisible()
    await expect(
      page.getByText('view your progress towards meeting your')
    ).toHaveCount(0)
  })

  test('links to the submitted certificate once the year is submitted', async ({
    page
  }) => {
    const url = `${producerObligationsPath(PRODUCER_ALREADY_SUBMITTED_ORGANISATION_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'View your certificate of compliance',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'View your certificate of compliance',
        exact: true
      })
    ).toHaveAttribute(
      'href',
      new RegExp(
        `/compliance/certificate/${PRODUCER_ALREADY_SUBMITTED_DECLARATION_ID}`
      )
    )
    await expect(
      page.getByRole('button', { name: 'Submit your certificate', exact: true })
    ).toHaveCount(0)
  })

  test('offers resubmission once the certificate was cancelled', async ({
    page
  }) => {
    const url = `${producerObligationsPath(PRODUCER_CANCELLED_ORGANISATION_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'Resubmit your certificate of compliance',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Resubmit your certificate',
        exact: true
      })
    ).toHaveAttribute(
      'href',
      new RegExp(
        `/compliance/certificate\\?year=${INTEGRATION_OBLIGATION_YEAR}`
      )
    )
    await expect(
      page.getByRole('button', { name: 'Submit your certificate', exact: true })
    ).toHaveCount(0)
  })
})
