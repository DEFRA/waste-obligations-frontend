import { expect, test } from '../fixtures/test.js'

import {
  CSOC_ALREADY_SUBMITTED_DECLARATION_ID,
  CSOC_ALREADY_SUBMITTED_SCHEME_ID,
  INTEGRATION_OBLIGATION_YEAR,
  csoObligationsPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

test.describe('CSoC manage obligations for a submitted year', () => {
  test('links to the submitted statement once the year is submitted', async ({
    page
  }) => {
    const url = `${csoObligationsPath(CSOC_ALREADY_SUBMITTED_SCHEME_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'View your statement of compliance',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'View your statement', exact: true })
    ).toHaveAttribute(
      'href',
      new RegExp(
        `/compliance/statement/${CSOC_ALREADY_SUBMITTED_DECLARATION_ID}`
      )
    )
    await expect(
      page.getByRole('button', { name: 'Submit your statement', exact: true })
    ).toHaveCount(0)
  })
})
