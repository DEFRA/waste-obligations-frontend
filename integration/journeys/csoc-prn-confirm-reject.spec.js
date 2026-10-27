import { expect, test } from '../fixtures/test.js'

import {
  CSOC_AWAITING_ACCEPTANCE_PRN_ID,
  CSOC_PERN_REJECT_SCENARIO,
  CSOC_REJECT_FLOW_PRN_ID,
  csoConfirmRejectPrnPath,
  csoPrnPath,
  INTEGRATION_OBLIGATION_YEAR
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'
import { expectRejectionConfirmation } from '../helpers/prn-rejection.js'
import { resetWireMockScenario } from '../helpers/wiremock-scenarios.js'

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

  test('rejects the PERN and shows the confirmation', async ({
    page,
    request
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const prnId = CSOC_REJECT_FLOW_PRN_ID
    const prnUrl = `${csoPrnPath(prnId)}?year=${year}`

    await resetWireMockScenario(request, CSOC_PERN_REJECT_SCENARIO)
    await visitAuthenticatedPath(page, prnUrl)

    await page
      .getByRole('button', { name: 'Reject this PERN', exact: true })
      .click()
    await page.getByRole('button', { name: 'Yes, reject', exact: true }).click()

    await expect(page).toHaveURL(
      (url) =>
        url.pathname.endsWith(`/prns/${prnId}`) &&
        url.searchParams.get('year') === String(year) &&
        url.searchParams.get('confirmed') === '1'
    )
    await expectRejectionConfirmation(page, { type: 'PERN', year })
  })
})
