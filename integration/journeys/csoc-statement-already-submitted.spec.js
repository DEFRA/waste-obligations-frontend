import { expect, test } from '@playwright/test'

import {
  CSOC_ALREADY_SUBMITTED_DECLARATION_ID,
  CSOC_ALREADY_SUBMITTED_YEAR,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement already submitted', () => {
  test('shows already submitted on the about page and redirects submit to view', async ({
    page
  }) => {
    const year = CSOC_ALREADY_SUBMITTED_YEAR
    const statementAboutUrl = `${csoStatementPath()}?year=${year}`
    const submitUrl = `${csoStatementPath('/submit')}?year=${year}`
    const viewUrl = `${csoStatementPath(`/${CSOC_ALREADY_SUBMITTED_DECLARATION_ID}`)}`

    await visitAuthenticatedPath(page, statementAboutUrl)

    await expect(page).toHaveTitle(/About your 2025 statement of compliance/)
    await expect(
      page.getByText(
        'You have already submitted your statement of compliance for 2025.'
      )
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0)

    await visitAuthenticatedPath(page, submitUrl, { expectExactPath: false })
    await expect(page).toHaveURL(new RegExp(`${viewUrl}$`))
    await expect(page).toHaveTitle(/2025 statement of compliance/)
    await expect(
      page.getByRole('heading', {
        name: '2025 statement of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(page.getByText('Alex Smith')).toBeVisible()
  })
})
