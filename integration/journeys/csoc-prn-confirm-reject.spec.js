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
import {
  answerRejectQuestion,
  expectChooseOptionError,
  expectRejectQuestion,
  expectStillAwaitingAcceptance
} from '../helpers/prn-confirm-reject.js'
import { expectRejectionConfirmation } from '../helpers/prn-rejection.js'
import { resetWireMockScenario } from '../helpers/wiremock-scenarios.js'

test.describe('CSoC PRN confirm-reject', () => {
  test('asks to confirm the rejection, needs a choice, and returns to the awaiting PRN on No, go back', async ({
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
    await expect(page).toHaveTitle(
      /^Are you sure you want to reject this PRN\?/
    )
    await expectRejectQuestion(page, { type: 'PRN' })

    const backLink = page.getByRole('link', { name: 'Back', exact: true })
    await expect(backLink).toHaveAttribute('href', prnHref)

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(confirmHref)
    await expectChooseOptionError(page)

    await answerRejectQuestion(page, 'No, go back')
    await expect(page).toHaveURL(prnHref)
    await expect(
      page.getByRole('heading', { name: 'Packaging recycling note', level: 1 })
    ).toBeVisible()
    await expectStillAwaitingAcceptance(page, { type: 'PRN' })
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
    await answerRejectQuestion(page, 'Yes, reject this PERN')

    await expect(page).toHaveURL(
      (url) =>
        url.pathname.endsWith(`/prns/${prnId}`) &&
        url.searchParams.get('year') === String(year) &&
        url.searchParams.get('confirmed') === '1'
    )
    await expectRejectionConfirmation(page, { type: 'PERN', year })
  })
})
