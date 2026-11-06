import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  producerObligationsPath,
  producerPrnsPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// The integration server's clock starts at 15 December 2026, inside the window
// in which next year can be chosen.
const CURRENT_YEAR = INTEGRATION_OBLIGATION_YEAR
const NEXT_YEAR = CURRENT_YEAR + 1

test.describe('Producer obligations year rules', () => {
  test('2025 and earlier open the certificate of compliance record', async ({
    page
  }) => {
    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}?year=2025`,
      {
        expectExactPath: false
      }
    )

    await expect(
      page.getByRole('heading', {
        name: 'Your certificate of compliance record for 2025',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        'We cannot show certificates of compliance for 2025, because they were processed outside the service.'
      )
    ).toBeVisible()
    await expect(
      page.getByRole('link', {
        name: 'packagingproducers@environment-agency.gov.uk'
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Your 2025 PRNs and PERNs' })
    ).toBeVisible()
    expect(new URL(page.url()).pathname).toContain(
      '/obligations/compliance-record'
    )
  })

  test('a year beyond next year opens the current year', async ({ page }) => {
    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}?year=2028`,
      {
        expectExactPath: false
      }
    )

    await expect(
      page.getByRole('heading', {
        name: `Manage your ${CURRENT_YEAR} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
    expect(new URL(page.url()).searchParams.get('year')).toBe(
      String(CURRENT_YEAR)
    )
  })

  test('the material page applies the same rule and keeps the material', async ({
    page
  }) => {
    await visitAuthenticatedPath(
      page,
      `${producerObligationsPath()}/plastic?year=2028`,
      { expectExactPath: false }
    )

    await expect(
      page.getByRole('heading', {
        name: `Your ${CURRENT_YEAR} recycling obligation for plastic`,
        level: 1
      })
    ).toBeVisible()
  })

  test('a year that is not a whole number is rejected', async ({ page }) => {
    await visitAuthenticatedPath(page, `${producerObligationsPath()}?year=abc`)

    await expect(
      page.getByRole('heading', { name: 'Bad Request' })
    ).toBeVisible()
  })

  test('the PRN list does not offer a year beyond next year', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, `${producerPrnsPath()}?year=2028`)

    await expect(
      page.getByRole('heading', { name: 'Bad Request' })
    ).toBeVisible()
  })
})

test.describe('Producer manage obligations for next year', () => {
  const url = `${producerObligationsPath()}?year=${NEXT_YEAR}`

  test('explains that the obligations are not calculated yet', async ({
    page
  }) => {
    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: `Manage your ${NEXT_YEAR} recycling obligations`,
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        `Your ${NEXT_YEAR} recycling obligations have not been calculated yet. They will be calculated after:`
      )
    ).toBeVisible()
    await expect(
      page.getByText(`you submit your packaging data for ${CURRENT_YEAR}`)
    ).toBeVisible()
    await expect(page.getByText('Until then, you can:')).toBeVisible()
    await expect(page.getByText('No data yet')).toHaveCount(10)
  })

  test('shows a dash, not 0, where there is no POM data', async ({ page }) => {
    await visitAuthenticatedPath(page, url)

    const plasticRow = page.getByRole('row', { name: /^Plastic/ })

    await expect(plasticRow.getByRole('cell').nth(0)).toHaveText(/-/)
    await expect(plasticRow.getByRole('cell').nth(3)).toHaveText(/-/)
  })

  test('explains December waste in a panel that opens', async ({ page }) => {
    await visitAuthenticatedPath(page, url)

    const summary = page.getByText(
      'Why does the recycling obligations table already have tonnage awaiting acceptance?'
    )

    await expect(summary).toBeVisible()
    await expect(
      page.getByText(
        'have a blue tag to show which years you can accept them towards'
      )
    ).toBeHidden()

    await summary.click()

    await expect(
      page.getByText(
        `can be accepted towards either your ${CURRENT_YEAR} or ${NEXT_YEAR} recycling obligations`
      )
    ).toBeVisible()
  })

  test('does not offer to submit the certificate', async ({ page }) => {
    await visitAuthenticatedPath(page, url)

    await expect(
      page.getByRole('heading', {
        name: `Review your PRNs and PERNs for ${NEXT_YEAR}`
      })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'Submit your certificate of compliance'
      })
    ).toHaveCount(0)
  })

  test('shows the same content in Welsh', async ({ page }) => {
    await visitAuthenticatedPath(page, `${url}&lang=cy`)

    await expect(
      page.getByText(
        `Mae eich rhwymedigaethau ailgylchu ${NEXT_YEAR} heb gael eu cyfrifo eto.`
      )
    ).toBeVisible()
    await expect(page.getByText('Tan hynny, rydych chi’n gallu:')).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: "Sut i gyflawni'ch rhwymedigaethau ailgylchu"
      })
    ).toBeVisible()
  })
})
