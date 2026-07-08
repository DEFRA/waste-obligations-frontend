import { expect, test } from '@playwright/test'

import {
  CSOC_INTEGRATION_USER_EMAIL,
  CSOC_OBLIGATION_YEAR,
  CSOC_REG43_NO_DECLARATION_ID,
  CSOC_REG43_NO_SUBMITTER_NAME,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC statement submit regulation 43 no', () => {
  test('submits when regulation 43 is not complied and shows the confirmation', async ({
    page
  }) => {
    const year = CSOC_OBLIGATION_YEAR
    const statementAboutUrl = `${csoStatementPath()}?year=${year}`
    const submitUrl = `${csoStatementPath('/submit')}?year=${year}`
    const successUrl = `${csoStatementPath(`/${CSOC_REG43_NO_DECLARATION_ID}/success`)}`
    const viewUrl = `${csoStatementPath(`/${CSOC_REG43_NO_DECLARATION_ID}`)}`

    await visitAuthenticatedPath(page, statementAboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await page.getByRole('radio', { name: 'No' }).check()
    await page
      .getByLabel('Enter your full name')
      .fill(CSOC_REG43_NO_SUBMITTER_NAME)
    await page.getByRole('button', { name: 'Confirm and submit' }).click()

    await expect(page).toHaveURL(new RegExp(`${successUrl}$`))
    await expect(
      page.getByText('not complied with regulation 43 requirements')
    ).toBeVisible()
    await expect(
      page.getByText(
        `We have sent a confirmation email to: ${CSOC_INTEGRATION_USER_EMAIL}`
      )
    ).toBeVisible()

    await page.getByRole('button', { name: 'View your statement' }).click()
    await expect(page).toHaveURL(new RegExp(`${viewUrl}$`))
    await expect(
      page.getByText('Not compliant with regulation 43 requirements')
    ).toBeVisible()
    await expect(
      page.getByText(
        'Example Compliance Scheme met its 2026 recycling obligations but did not comply with all other regulation 43 requirements.'
      )
    ).toBeVisible()
    await expect(page.getByText(CSOC_REG43_NO_SUBMITTER_NAME)).toBeVisible()
  })
})
