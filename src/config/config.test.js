import { config } from './config.js'

describe('config', () => {
  test('does not configure an EPR Packaging clear-session URL by default', () => {
    expect(config.get('eprPackaging.clearSessionUrl')).toBeNull()
  })
})
