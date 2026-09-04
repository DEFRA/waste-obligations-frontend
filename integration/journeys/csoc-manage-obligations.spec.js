import { expect, test } from '../fixtures/test.js'

import {
  CSOC_COMPLIANCE_SCHEME_ID,
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
    const prnsUrl = `/cso/${CSOC_COMPLIANCE_SCHEME_ID}/prns`
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
    await expect(page.getByText('Environment Agency (England)')).toBeVisible()
    await expect(
      page.getByText('Number of PRNs and PERNs awaiting acceptance.')
    ).toBeVisible()
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible()
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
    ).toHaveAttribute('href', new RegExp(prnsUrl))
    await expect(
      page.getByRole('button', { name: 'Submit statement' })
    ).toHaveAttribute('href', new RegExp(statementUrl.replace('?', '\\?')))
  })
})
