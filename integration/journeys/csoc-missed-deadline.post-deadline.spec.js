import { expect, test } from '../fixtures/test.js'

import {
  CSOC_CANCELLED_SCHEME_ID,
  CSOC_COMPLIANCE_SCHEME_ID,
  INTEGRATION_OBLIGATION_YEAR,
  csoObligationsPath
} from '../fixtures/csoc-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

const SUBMISSION_DEADLINE_YEAR = INTEGRATION_OBLIGATION_YEAR + 1

test.describe('CSoC manage obligations after the submission deadline', () => {
  test('shows the missed statement copy with no submit button', async ({
    page
  }) => {
    const url = `${csoObligationsPath(CSOC_COMPLIANCE_SCHEME_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'You missed the statement of compliance deadline',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `You missed the submission deadline of 31 January ${SUBMISSION_DEADLINE_YEAR}. You can no longer submit your ${INTEGRATION_OBLIGATION_YEAR} statement of compliance.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Submit your statement', exact: true })
    ).toHaveCount(0)
  })

  test('explains that a cancelled statement can no longer be resubmitted', async ({
    page
  }) => {
    const url = `${csoObligationsPath(CSOC_CANCELLED_SCHEME_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'You missed the statement of compliance deadline',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `As the deadline of 31 January ${SUBMISSION_DEADLINE_YEAR} has now passed, you can no longer resubmit your statement.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Resubmit your statement', exact: true })
    ).toHaveCount(0)
  })
})
