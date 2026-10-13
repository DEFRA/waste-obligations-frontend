import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  CSOC_SUBMIT_FAILURE_FULL_NAME,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit failure', () => {
  test('shows the service error page when the obligations API cannot save the declaration', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const statementAboutUrl = `${csoStatementPath()}?year=${year}`
    const submitUrl = `${csoStatementPath('/submit')}?year=${year}`

    await visitAuthenticatedPath(page, statementAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Enter your full name')
      .fill(CSOC_SUBMIT_FAILURE_FULL_NAME)
    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    const main = page.locator('#main-content')
    await expect(
      main.getByRole('heading', {
        name: 'Sorry, there is a problem with the service',
        level: 1
      })
    ).toBeVisible()
    await expect(main.getByText('Try again later.')).toBeVisible()
    await expect(
      main.getByRole('link', { name: 'eprcustomerservice@defra.gov.uk' })
    ).toBeVisible()
  })
})
