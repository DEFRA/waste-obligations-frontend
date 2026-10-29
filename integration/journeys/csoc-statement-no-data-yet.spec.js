import { expect, test } from '../fixtures/test.js'

import {
  CSOC_NO_DATA_YET_DECLARATION_ID,
  CSOC_NO_DATA_YET_SCHEME_ID,
  INTEGRATION_OBLIGATION_YEAR,
  csoStatementPath
} from '../fixtures/csoc-scenario.js'
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

test.describe('CSoC statement obligations with no data yet', () => {
  test('shows dashes for every No data yet material, glass and totals on the submit page', async ({
    page
  }) => {
    const year = INTEGRATION_OBLIGATION_YEAR
    const schemeId = CSOC_NO_DATA_YET_SCHEME_ID
    const aboutUrl = `${csoStatementPath(schemeId)}?year=${year}`
    const submitUrl = `${csoStatementPath(schemeId, '/submit')}?year=${year}`

    await visitAuthenticatedPath(page, aboutUrl)
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(
      new RegExp(`${submitUrl.replace('?', '\\?')}$`)
    )

    const obligationsTable = page.getByRole('table').first()

    for (const name of [/Plastic/, /^Glass/, /Total/]) {
      const row = obligationsTable.getByRole('row', { name })

      await expect(row.getByRole('cell').nth(OBLIGATION_TO_MEET)).toHaveText(
        /-/
      )
      await expect(row.getByRole('cell').nth(OUTSTANDING)).toHaveText(/-/)
    }
  })

  test('shows dashes for a No data yet material on the submitted statement', async ({
    page
  }) => {
    const viewUrl = csoStatementPath(
      CSOC_NO_DATA_YET_SCHEME_ID,
      `/${CSOC_NO_DATA_YET_DECLARATION_ID}`
    )

    await visitAuthenticatedPath(page, viewUrl)
    await expect(
      page.getByRole('heading', {
        name: '2026 statement of compliance',
        level: 1
      })
    ).toBeVisible()

    await expectNoDataYetDashesAndLowTonnageZeros(page)
  })
})
