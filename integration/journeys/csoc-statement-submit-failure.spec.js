import { expect, test } from '@playwright/test'

import {
  CSOC_OBLIGATION_YEAR,
  CSOC_SUBMIT_FAILURE_FULL_NAME,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit failure', () => {
  test('shows the technical error page when the obligations API cannot save the declaration', async ({
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

    await page.getByRole('radio', { name: 'Yes' }).check()
    await page
      .getByLabel('Enter your full name')
      .fill(CSOC_SUBMIT_FAILURE_FULL_NAME)
    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )
    await expect(
      page.getByRole('heading', {
        name: 'Sorry, there has been a technical error',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        'Your statement of compliance may not have been submitted.'
      )
    ).toBeVisible()
    await expect(
      page.getByText(
        'Check your email inbox for confirmation. If you have not received a confirmation email, you will need to submit your statement again.'
      )
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'homepage' })).toBeVisible()
  })
})
