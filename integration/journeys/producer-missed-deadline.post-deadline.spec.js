import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_CANCELLED_ORGANISATION_ID,
  PRODUCER_ORGANISATION_ID,
  producerObligationsPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

const SUBMISSION_DEADLINE_YEAR = INTEGRATION_OBLIGATION_YEAR + 1

test.describe('Producer manage obligations after the submission deadline', () => {
  test('shows the missed certificate copy with no submit button', async ({
    page
  }) => {
    const url = `${producerObligationsPath(PRODUCER_ORGANISATION_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'You missed the certificate of compliance deadline',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `You missed the submission deadline of 31 January ${SUBMISSION_DEADLINE_YEAR}. You can no longer submit your ${INTEGRATION_OBLIGATION_YEAR} certificate of compliance.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Submit your certificate', exact: true })
    ).toHaveCount(0)
  })

  test('explains that a cancelled certificate can no longer be resubmitted', async ({
    page
  }) => {
    const url = `${producerObligationsPath(PRODUCER_CANCELLED_ORGANISATION_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: 'You missed the certificate of compliance deadline',
        level: 3
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `As the deadline of 31 January ${SUBMISSION_DEADLINE_YEAR} has now passed, you can no longer resubmit your certificate.`
      )
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Resubmit your certificate',
        exact: true
      })
    ).toHaveCount(0)
  })
})
