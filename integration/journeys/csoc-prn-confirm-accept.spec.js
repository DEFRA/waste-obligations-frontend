import { expect, test } from '../fixtures/test.js'

import {
  CSOC_AWAITING_ACCEPTANCE_PRN_ID,
  csoConfirmAcceptPrnPath,
  csoPrnPath,
  INTEGRATION_OBLIGATION_YEAR
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC PRN confirm-accept', () => {
  test('shows the are-you-sure page and returns to the PRN on No, go back', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const prnId = CSOC_AWAITING_ACCEPTANCE_PRN_ID
    const confirmUrl = `${csoConfirmAcceptPrnPath(prnId)}?year=${year}`
    const prnUrl = `${csoPrnPath(prnId)}?year=${year}`
    const prnHref = new RegExp(`${prnUrl.replace('?', '\\?')}$`)

    await visitAuthenticatedPath(page, confirmUrl)

    await expect(page).toHaveTitle(/Accept this PRN/)
    await expect(
      page.getByRole('heading', {
        name: `Are you sure you want to accept this PRN towards your ${year} recycling obligations?`,
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `You will accept 10 tonnes towards your ${year} recycling obligation for steel.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Yes, accept' })
    ).toBeVisible()

    const goBack = page.getByRole('button', { name: 'No, go back' })
    await expect(goBack).toHaveAttribute('href', prnHref)

    await goBack.click()
    await expect(page).toHaveURL(prnHref)
  })
})
