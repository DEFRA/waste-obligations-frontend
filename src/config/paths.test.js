import { isSafeReturnPath } from './paths.js'

describe('isSafeReturnPath', () => {
  test('allows same-origin relative paths', () => {
    expect(isSafeReturnPath('/')).toBe(true)
    expect(
      isSafeReturnPath('/compliance/producer/org/certificate?year=2024')
    ).toBe(true)
  })

  test('rejects empty or non-string values', () => {
    expect(isSafeReturnPath('')).toBe(false)
    expect(isSafeReturnPath(null)).toBe(false)
    expect(isSafeReturnPath(undefined)).toBe(false)
  })

  test('rejects protocol-relative and absolute URLs', () => {
    expect(isSafeReturnPath('//evil.example/phish')).toBe(false)
    expect(isSafeReturnPath('https://evil.example/phish')).toBe(false)
    expect(isSafeReturnPath('/redirect?url=https://evil.example')).toBe(false)
  })

  test('rejects paths that do not start with /', () => {
    expect(isSafeReturnPath('compliance')).toBe(false)
  })
})
