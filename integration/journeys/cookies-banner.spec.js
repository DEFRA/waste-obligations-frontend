import { expect, test } from '../fixtures/test.js'

test.describe('Cookie banner', () => {
  test('accepts analytics cookies from the banner and can change them later', async ({
    page
  }) => {
    await page.goto('cookies')

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Accept analytics cookies' }).click()

    await expect(
      page.getByText('You’ve accepted analytics cookies.')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked()

    await page.getByRole('radio', { name: 'No' }).check()
    await page.getByRole('button', { name: 'Save cookie settings' }).click()

    await expect(
      page.getByText('You’ve set your cookie preferences.')
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
  })

  test('rejects analytics cookies from the banner', async ({ page }) => {
    await page.goto('signed-out')

    await page.getByRole('button', { name: 'Reject analytics cookies' }).click()

    await expect(
      page.getByText('You’ve rejected analytics cookies.')
    ).toBeVisible()

    await page.reload()

    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)

    await page.goto('cookies')

    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)
  })

  test('opens the cookies page from the banner', async ({ page }) => {
    await page.goto('signed-out')

    await expect(
      page.locator('.govuk-cookie-banner :is(h1, h2, h3, h4, h5, h6)')
    ).toHaveCount(0)

    await page.getByRole('link', { name: 'View cookies' }).click()

    await expect(page).toHaveURL(/\/cookies$/)
    await expect(
      page.getByRole('heading', { name: 'Cookies', level: 1 })
    ).toBeVisible()
  })
})

test.describe('Cookies page', () => {
  test('shows essential cookies, analytics cookies and settings', async ({
    page
  }) => {
    await page.goto('cookies')

    const main = page.locator('#main-content')

    await expect(
      main.getByRole('heading', { name: 'Essential cookies', level: 2 })
    ).toBeVisible()
    await expect(
      main.getByRole('heading', { name: 'Analytics cookies', level: 2 })
    ).toBeVisible()
    await expect(
      main.getByText(
        'We only set Google Analytics cookies if you give us permission.'
      )
    ).toBeVisible()
    await expect(main.getByText('_ga', { exact: true })).toBeVisible()
    await expect(main.getByText('_ga_<measurement-id>')).toBeVisible()
    await expect(main.getByText('2 years').first()).toBeVisible()
    await expect(
      main.getByRole('heading', {
        name: 'Change your cookie settings',
        level: 2
      })
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'No' })).toBeChecked()
  })

  test('saves analytics preference from the cookies page', async ({ page }) => {
    await page.goto('cookies')

    await page.getByRole('radio', { name: 'Yes' }).check()
    await page.getByRole('button', { name: 'Save cookie settings' }).click()

    await expect(
      page.getByText('You’ve set your cookie preferences.')
    ).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Yes' })).toBeChecked()
    await expect(
      page.getByRole('button', { name: 'Accept analytics cookies' })
    ).toHaveCount(0)
  })

  test('opens cookies from the footer', async ({ page }) => {
    await page.goto('signed-out')

    await page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Cookies' })
      .click()

    await expect(page).toHaveURL(/\/cookies$/)
    await expect(
      page.getByRole('heading', { name: 'Cookies', level: 1 })
    ).toBeVisible()
  })
})
