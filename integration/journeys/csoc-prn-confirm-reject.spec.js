import { expect, test } from '../fixtures/test.js'

import {
  CSOC_AWAITING_ACCEPTANCE_PRN_ID,
  csoConfirmRejectPrnPath,
  csoPrnPath,
  INTEGRATION_OBLIGATION_YEAR
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC PRN confirm-reject', () => {
  test('opens the reject confirmation from the awaiting PRN and returns on No, go back', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const prnId = CSOC_AWAITING_ACCEPTANCE_PRN_ID
    const prnUrl = `${csoPrnPath(prnId)}?year=${year}`
    const confirmUrl = `${csoConfirmRejectPrnPath(prnId)}?year=${year}`
    const prnHref = new RegExp(`${prnUrl.replace('?', '\\?')}$`)
    const confirmHref = new RegExp(`${confirmUrl.replace('?', '\\?')}$`)

    await visitAuthenticatedPath(page, prnUrl)

    const reject = page.getByRole('button', {
      name: 'Reject this PRN',
      exact: true
    })
    await expect(reject).toBeEnabled()
    await expect(reject).toHaveAttribute('href', confirmHref)

    await reject.click()
    await expect(page).toHaveURL(confirmHref)
    await expect(
      page.getByRole('heading', {
        name: 'Are you sure you want to reject this PRN?',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText('You will not be able to accept it later')
    ).toBeVisible()

    const goBack = page.getByRole('button', { name: 'No, go back' })
    await expect(goBack).toHaveAttribute('href', prnHref)
    await goBack.click()
    await expect(page).toHaveURL(prnHref)
  })
})
