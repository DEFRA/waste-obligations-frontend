import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  producerConfirmRejectPrnPath,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

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
})
