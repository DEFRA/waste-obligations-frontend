import { expect, test } from '../fixtures/test.js'

import {
  CSOC_CANCELLED_SCHEME_ID,
  CSOC_COMPLIANCE_SCHEME_ID,
  CSOC_NO_DATA_YET_SCHEME_ID,
  INTEGRATION_OBLIGATION_YEAR,
  csoObligationsPath,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC manage obligations', () => {
  test('shows the manage obligations page with statement next steps', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${csoObligationsPath()}?year=${year}`
    const prnsUrl = `/cso/${CSOC_COMPLIANCE_SCHEME_ID}/prns?year=${year}`
    const statementUrl = `${csoStatementPath()}?year=${year}`

    await visitAuthenticatedPath(page, obligationsUrl)

    await expect(page).toHaveTitle(/Manage your recycling obligations/)
    await expect(
      page.getByRole('heading', {
        name: `Manage your ${year} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
    await expect(page.getByText('Scheme Operator Ltd')).toBeVisible()
    await expect(page.getByText('Environment Agency')).toBeVisible()
    await expect(
      page.getByText('Number of PRNs and PERNs awaiting acceptance.')
    ).toBeVisible()
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'How to meet your recycling obligations',
        level: 2
      })
    ).toBeVisible()
    await expect(page.getByText('Plastic').first()).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'Submit your statement of compliance',
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
      page.getByRole('button', { name: 'Submit your statement', exact: true })
    ).toHaveAttribute('href', new RegExp(statementUrl.replace('?', '\\?')))
  })

  test('offers resubmission once the statement was cancelled', async ({
    page
  }) => {
    const url = `${csoObligationsPath(CSOC_CANCELLED_SCHEME_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'Resubmit your statement of compliance',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Resubmit your statement', exact: true })
    ).toHaveAttribute(
      'href',
      new RegExp(`/compliance/statement\\?year=${INTEGRATION_OBLIGATION_YEAR}`)
    )
    await expect(
      page.getByRole('button', { name: 'Submit your statement', exact: true })
    ).toHaveCount(0)
  })

  test('shows the alternative How to meet content when no obligations have been calculated', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${csoObligationsPath(CSOC_NO_DATA_YET_SCHEME_ID)}?year=${year}`

    await visitAuthenticatedPath(page, obligationsUrl)

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
      page.getByText('Until then, you can:', { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(
        'You will see data for PRNs and PERNs you have acquired in the table below.',
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      page.getByRole('row', { name: /Plastic/ }).getByText('No data yet')
    ).toBeVisible()
    await expect(
      page.getByText('view your progress towards meeting your')
    ).toHaveCount(0)
  })

  test('shows the alternative How to meet content in Welsh when no obligations have been calculated', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${csoObligationsPath(CSOC_NO_DATA_YET_SCHEME_ID)}?year=${year}&lang=cy`

    await visitAuthenticatedPath(page, obligationsUrl)

    await expect(
      page.getByText(
        `Mae eich rhwymedigaethau ailgylchu ${year} heb gael eu cyfrifo eto.`,
        { exact: true }
      )
    ).toBeVisible()
    await expect(
      page.getByText(
        `ar ôl ichi'n cyflwyno'ch data pecynwaith ar gyfer ${year - 1}`,
        { exact: true }
      )
    ).toBeVisible()
  })

  test('keeps the regular How to meet content when obligations have been calculated', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const obligationsUrl = `${csoObligationsPath()}?year=${year}`

    await visitAuthenticatedPath(page, obligationsUrl)

    await expect(
      page.getByText(
        `view your progress towards meeting your ${year} recycling obligations`
      )
    ).toBeVisible()
    await expect(page.getByText('have not been calculated yet')).toHaveCount(0)
  })
})
