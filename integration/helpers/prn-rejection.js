import { expect } from '@playwright/test'

// The rejection confirmation is the PRN detail page after a successful reject.
export async function expectRejectionConfirmation(page, { type, year }) {
  await expect(
    page.locator(
      '.govuk-notification-banner--success .govuk-notification-banner__heading'
    )
  ).toHaveText(`You have rejected this ${type}.`)
  await expect(
    page.getByText(`The producer or compliance scheme rejected the ${type}.`)
  ).toBeVisible()

  const status = page.locator('.prn-hide-in-pdf .govuk-tag')
  await expect(status).toHaveText('Rejected')
  await expect(status).toHaveClass(/govuk-tag--red/)

  await expect(
    page.getByRole('button', {
      name: `Download this ${type} as a PDF`,
      exact: true
    })
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: `Accept or reject more PRNs and PERNs for ${year}`,
      exact: true
    })
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: `View your ${year} recycling obligations progress`,
      exact: true
    })
  ).toBeVisible()
}
