import { expect, test } from '@playwright/test'

import {
  CSOC_OBLIGATION_YEAR,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit validation', () => {
  test('shows validation errors when regulation 43 and full name are missing', async ({
    page
  }) => {
    const year = CSOC_OBLIGATION_YEAR
    const statementAboutUrl = `${csoStatementPath()}?year=${year}`
    const submitUrl = `${csoStatementPath('/submit')}?year=${year}`

    await visitAuthenticatedPath(page, statementAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )
    await expect(page.locator('#regulation43Compliant-error')).toContainText(
      "You must select 'yes' or 'no' to continue"
    )
    await expect(page.locator('#fullName-error')).toContainText(
      'You must enter your full name'
    )
  })
})
