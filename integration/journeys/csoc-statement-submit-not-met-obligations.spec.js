import { expect, test } from '../fixtures/test.js'

import {
  CSOC_NOT_MET_SCHEME_ID,
  INTEGRATION_OBLIGATION_YEAR,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit not met obligations', () => {
  test('shows not met recycling obligations on the submit page', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const schemeId = CSOC_NOT_MET_SCHEME_ID
    const statementAboutUrl = `${csoStatementPath(schemeId)}?year=${year}`
    const submitUrl = `${csoStatementPath(schemeId, '/submit')}?year=${year}`

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
