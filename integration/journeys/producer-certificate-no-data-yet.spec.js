import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_NO_DATA_YET_DECLARATION_ID,
  PRODUCER_NO_DATA_YET_ORGANISATION_ID,
  producerCertificatePath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// The material is the row header, so the cells run: obligation to meet (0),
// awaiting acceptance (1), accepted (2), outstanding (3), status (4).
const OBLIGATION_TO_MEET = 0
const OUTSTANDING = 3

async function expectNoDataYetDashesAndLowTonnageZeros(page) {
  const plasticRow = page.getByRole('row', { name: /Plastic/ })
  const woodRow = page.getByRole('row', { name: /Wood/ })

  await expect(plasticRow).toContainText('No data yet')
  await expect(plasticRow.getByRole('cell').nth(OBLIGATION_TO_MEET)).toHaveText(
    /-/
  )
  await expect(
    plasticRow.getByRole('cell').nth(OBLIGATION_TO_MEET)
  ).toContainText('Not available yet')
  await expect(plasticRow.getByRole('cell').nth(OUTSTANDING)).toHaveText(/-/)
  await expect(woodRow.getByRole('cell').nth(OBLIGATION_TO_MEET)).toHaveText(
    '0'
  )
  await expect(woodRow.getByRole('cell').nth(OUTSTANDING)).toHaveText('0')
}

test.describe('Producer certificate obligations with no data yet', () => {
  test('shows dashes for a No data yet material on the submit page', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const organisationId = PRODUCER_NO_DATA_YET_ORGANISATION_ID
    const aboutUrl = `${producerCertificatePath(organisationId)}?year=${year}`
    const submitUrl = `${producerCertificatePath(organisationId, '/submit')}?year=${year}`

    await visitAuthenticatedPath(page, aboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    await expectNoDataYetDashesAndLowTonnageZeros(page)
  })

  test('shows dashes for a No data yet material on the submitted certificate', async ({
    page
  }) => {
    const viewUrl = producerCertificatePath(
      PRODUCER_NO_DATA_YET_ORGANISATION_ID,
      `/${PRODUCER_NO_DATA_YET_DECLARATION_ID}`
    )

    await visitAuthenticatedPath(page, viewUrl)
    await expect(
      page.getByRole('heading', {
        name: '2026 certificate of compliance',
        level: 1
      })
    ).toBeVisible()

    await expectNoDataYetDashesAndLowTonnageZeros(page)
  })
})
