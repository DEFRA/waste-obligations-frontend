import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  PRODUCER_PRN_REJECT_SCENARIO,
  PRODUCER_REJECT_FLOW_PRN_ID,
  producerConfirmRejectPrnPath,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'
import { expectRejectionConfirmation } from '../helpers/prn-rejection.js'
import { resetWireMockScenario } from '../helpers/wiremock-scenarios.js'

test.describe('Producer PRN confirm-reject', () => {
  test('opens the reject confirmation from the awaiting PRN and returns on No, go back', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const prnId = PRODUCER_AWAITING_ACCEPTANCE_PRN_ID
    const prnUrl = `${producerPrnPath(prnId)}?year=${year}`
    const confirmUrl = `${producerConfirmRejectPrnPath(prnId)}?year=${year}`
    const prnHref = new RegExp(`${prnUrl.replace('?', '\\?')}$`)
    const confirmHref = new RegExp(`${confirmUrl.replace('?', '\\?')}$`)

    await visitAuthenticatedPath(page, prnUrl)

    const reject = page.getByRole('button', {
      name: 'Reject this PRN',
      exact: true
    })
    await expect(reject).toBeEnabled()
    await expect(reject).toHaveClass(/govuk-button--warning/)
    await expect(reject).toHaveAttribute('href', confirmHref)

    await reject.click()
    await expect(page).toHaveURL(confirmHref)
    await expect(page).toHaveTitle(/Are you sure you want to reject this PRN\?/)
    await expect(
      page.getByRole('heading', {
        name: 'Are you sure you want to reject this PRN?',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText('You will not be able to accept it later')
    ).toBeVisible()

    const yes = page.getByRole('button', { name: 'Yes, reject', exact: true })
    await expect(yes).toBeVisible()
    await expect(yes).toHaveClass(/govuk-button--warning/)
    await expect(yes).toHaveAttribute('type', 'submit')

    const goBack = page.getByRole('button', { name: 'No, go back' })
    await expect(goBack).toHaveAttribute('href', prnHref)

    const backLink = page.getByRole('link', { name: 'Back', exact: true })
    await expect(backLink).toHaveAttribute('href', prnHref)

    await goBack.click()
    await expect(page).toHaveURL(prnHref)
    await expect(
      page.getByRole('heading', { name: 'Packaging recycling note', level: 1 })
    ).toBeVisible()
  })

  test('rejects the PRN and shows the confirmation', async ({
    page,
    request
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const prnId = PRODUCER_REJECT_FLOW_PRN_ID
    const prnUrl = `${producerPrnPath(prnId)}?year=${year}`

    await resetWireMockScenario(request, PRODUCER_PRN_REJECT_SCENARIO)
    await visitAuthenticatedPath(page, prnUrl)

    await page
      .getByRole('button', { name: 'Reject this PRN', exact: true })
      .click()
    await page.getByRole('button', { name: 'Yes, reject', exact: true }).click()

    await expect(page).toHaveURL(
      (url) =>
        url.pathname.endsWith(`/prns/${prnId}`) &&
        url.searchParams.get('year') === String(year) &&
        url.searchParams.get('confirmed') === '1'
    )
    await expectRejectionConfirmation(page, { type: 'PRN', year })
  })
})
