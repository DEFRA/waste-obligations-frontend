import { expect, test } from '../fixtures/test.js'

import {
  CSOC_COMPLIANCE_DECLARATION_ID,
  CSOC_INTEGRATION_USER_EMAIL,
  INTEGRATION_OBLIGATION_YEAR,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit journey', () => {
  test('submits a statement and views the confirmation', async ({ page }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const statementAboutUrl = `${csoStatementPath()}?year=${year}`
    const submitUrl = `${csoStatementPath('/submit')}?year=${year}`
    const successUrl = `${csoStatementPath(`/${CSOC_COMPLIANCE_DECLARATION_ID}/success`)}`
    const viewUrl = `${csoStatementPath(`/${CSOC_COMPLIANCE_DECLARATION_ID}`)}`

    await visitAuthenticatedPath(page, statementAboutUrl)

    await expect(page).toHaveTitle(/About your 2026 statement of compliance/)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await expect(page).toHaveTitle(
      /Check and submit your statement of compliance/
    )
    await expect(
      page.getByRole('heading', {
        name: 'Check and submit your 2026 statement of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page
        .getByRole('definition')
        .filter({ hasText: 'Example Compliance Scheme' })
    ).toBeVisible()
    await expect(
      page.getByText('Recycling obligations have been met')
    ).toBeVisible()

    await page.getByRole('radio', { name: 'Yes' }).check()
    await page.getByLabel('Enter your full name').fill('Jane Doe')
    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(new RegExp(`${successUrl}$`))
    await expect(page).toHaveTitle(/Statement of compliance submitted/)
    await expect(
      page.getByRole('heading', {
        name: 'You have submitted your 2026 statement of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `We have sent a confirmation email to: ${CSOC_INTEGRATION_USER_EMAIL}`
      )
    ).toBeVisible()

    await page.getByRole('button', { name: 'View your statement' }).click()
    await expect(page).toHaveURL(new RegExp(`${viewUrl}$`))
    await expect(page).toHaveTitle(/2026 statement of compliance/)
    await expect(
      page.getByRole('heading', {
        name: '2026 statement of compliance',
        level: 1
      })
    ).toBeVisible()
    await expect(page.getByText('Recycling obligations met')).toBeVisible()
    await expect(page.getByText('Jane Doe')).toBeVisible()
  })
})
