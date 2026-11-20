import { expect } from '@playwright/test'

// The "Are you sure you want to reject this PRN?" question: two radios and a
// single Continue button.
export async function expectRejectQuestion(page, { type }) {
  await expect(
    page.getByRole('heading', {
      name: `Are you sure you want to reject this ${type}?`,
      level: 1
    })
  ).toBeVisible()
  await expect(
    page.getByText('You will not be able to accept it later')
  ).toBeVisible()

  const yes = page.getByRole('radio', { name: `Yes, reject this ${type}` })
  const goBack = page.getByRole('radio', { name: 'No, go back' })
  await expect(yes).not.toBeChecked()
  await expect(goBack).not.toBeChecked()

  const continueButton = page.getByRole('button', { name: 'Continue' })
  await expect(continueButton).toBeEnabled()
  await expect(continueButton).not.toHaveClass(/govuk-button--warning/)
  await expect(
    page.getByRole('button', { name: 'Yes, reject', exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'No, go back', exact: true })
  ).toHaveCount(0)
}

export async function expectChooseOptionError(page) {
  await expect(page).toHaveTitle(/^Error: /)
  const summary = page.locator('.govuk-error-summary')
  await expect(summary).toBeFocused()
  await expect(summary.getByText('There is a problem')).toBeVisible()
  await expect(
    summary.getByRole('link', { name: 'You must choose an option' })
  ).toHaveAttribute('href', '#confirmReject')
  await expect(page.locator('.govuk-error-message')).toHaveText(
    'Error: You must choose an option'
  )
}

export async function answerRejectQuestion(page, option) {
  await page.getByRole('radio', { name: option }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
}

// The awaiting view shows its status as bold text and still offers Reject.
export async function expectStillAwaitingAcceptance(page, { type }) {
  await expect(
    page.getByText('Awaiting acceptance', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: `Reject this ${type}`, exact: true })
  ).toBeVisible()
}
