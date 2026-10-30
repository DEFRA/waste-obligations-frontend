import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  PRODUCER_DECEMBER_WASTE_PRN_ID,
  producerChooseYearPrnPath,
  producerConfirmAcceptPrnPath,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

const CHOOSE_YEAR_HEADING =
  'Which year’s recycling obligations do you want to accept this PRN towards?'

// The integration server's clock starts on 15 December 2026, inside the window
// in which a December waste PRN from 2026 can be accepted into 2026 or 2027.
test.describe('Producer PRN choose year to accept into', () => {
  const year = INTEGRATION_OBLIGATION_YEAR
  const chooseYearHref = new RegExp(
    `${producerChooseYearPrnPath(PRODUCER_DECEMBER_WASTE_PRN_ID)}\\?year=${year}$`
  )

  async function openChooseYear(page) {
    await visitAuthenticatedPath(
      page,
      `${producerPrnPath(PRODUCER_DECEMBER_WASTE_PRN_ID)}?year=${year}`
    )
    await page
      .getByRole('button', { name: 'Accept this PRN', exact: true })
      .click()
    await expect(page).toHaveURL(chooseYearHref)
  }

  test('asks which year to accept a December waste PRN into, offering this year and the next', async ({
    page
  }) => {
    await openChooseYear(page)

    await expect(page).toHaveTitle(/^Choose which year to accept this PRN into/)
    await expect(
      page.getByRole('heading', { name: CHOOSE_YEAR_HEADING, level: 1 })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(2)
    await expect(page.getByRole('radio', { name: '2026' })).not.toBeChecked()
    await expect(page.getByRole('radio', { name: '2027' })).not.toBeChecked()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  })

  test('continuing without a year shows an error and keeps the user on the page', async ({
    page
  }) => {
    await openChooseYear(page)

    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(chooseYearHref)
    await expect(page).toHaveTitle(/^Error: /)
    await expect(page.getByText('There is a problem')).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Select the year to accept into' })
    ).toHaveAttribute('href', '#acceptYear')
  })

  test('continuing with a year opens the are-you-sure page for that year, and Back returns to the choice', async ({
    page
  }) => {
    await openChooseYear(page)

    await page.getByRole('radio', { name: '2027' }).check()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(
      new RegExp(
        `${producerConfirmAcceptPrnPath(PRODUCER_DECEMBER_WASTE_PRN_ID)}\\?year=${year}&acceptYear=2027$`
      )
    )
    await expect(
      page.getByRole('heading', {
        name: 'Are you sure you want to accept this PRN towards your 2027 recycling obligations?',
        level: 1
      })
    ).toBeVisible()
    await expect(
      page.getByText(
        'You will accept 40 tonnes towards your 2027 recycling obligation for plastic.'
      )
    ).toBeVisible()

    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await expect(page).toHaveURL(chooseYearHref)
  })

  test('a standard PRN goes straight to the are-you-sure page with no year question', async ({
    page
  }) => {
    await visitAuthenticatedPath(
      page,
      `${producerPrnPath(PRODUCER_AWAITING_ACCEPTANCE_PRN_ID)}?year=${year}`
    )
    await page
      .getByRole('button', { name: 'Accept this PRN', exact: true })
      .click()

    await expect(page).toHaveURL(
      new RegExp(
        `${producerConfirmAcceptPrnPath(PRODUCER_AWAITING_ACCEPTANCE_PRN_ID)}\\?year=${year}$`
      )
    )
    await expect(
      page.getByRole('heading', {
        name: `Are you sure you want to accept this PRN towards your ${year} recycling obligations?`,
        level: 1
      })
    ).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)
  })
})
