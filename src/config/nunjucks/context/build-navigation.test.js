import { buildNavigation } from './build-navigation.js'

describe('#buildNavigation', () => {
  test('returns Home, Manage account, and Sign out links', () => {
    expect(
      buildNavigation({ path: '/compliance/producer/org/certificate' })
    ).toEqual([
      {
        text: 'Home',
        href: 'https://localhost:7084/report-data',
        active: false
      },
      {
        text: 'Manage account',
        href: 'https://localhost:7084/manage-account'
      },
      {
        text: 'Sign out',
        href: 'https://localhost:7084/report-data/Account/SignOut'
      }
    ])
  })

  test('marks Home as active on the service root path', () => {
    const navigation = buildNavigation({ path: '/' })

    expect(navigation[0]).toMatchObject({ text: 'Home', active: true })
  })

  test('does not mark Home active when path is missing', () => {
    const navigation = buildNavigation()

    expect(navigation[0]).toMatchObject({ text: 'Home', active: false })
  })
})
