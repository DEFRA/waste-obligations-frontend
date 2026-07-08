import { expect, test } from '@playwright/test'

import {
  CSOC_NOT_MET_OBLIGATIONS_YEAR,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit not met obligations', () => {
  test('shows not met recycling obligations on the submit page', async ({
    page
  }) => {
    const year = CSOC_NOT_MET_OBLIGATIONS_YEAR
    const statementAboutUrl = `${csoStatementPath()}?year=${year}`
    const submitUrl = `${csoStatementPath('/submit')}?year=${year}`

    await visitAuthenticatedPath(page, statementAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await expect(
      page.getByText('Recycling obligations have not been met')
    ).toBeVisible()
  })
})
