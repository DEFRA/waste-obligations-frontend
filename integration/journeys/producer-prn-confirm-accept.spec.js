import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  producerConfirmAcceptPrnPath,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('Producer PRN confirm-accept', () => {
  test('shows the are-you-sure page and returns to the PRN on No, go back', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const prnId = PRODUCER_AWAITING_ACCEPTANCE_PRN_ID
    const confirmUrl = `${producerConfirmAcceptPrnPath(prnId)}?year=${year}`
    const prnUrl = `${producerPrnPath(prnId)}?year=${year}`
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
        `You will accept 50 tonnes towards your ${year} recycling obligation for plastic.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Yes, accept' })
    ).toBeVisible()

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
