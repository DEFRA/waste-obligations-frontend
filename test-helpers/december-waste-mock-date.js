/* eslint-disable new-cap */
// Freezes the server clock at DECEMBER_WASTE_FLASH_DATE (default 15 Dec 2026). Preload it with
// NODE_OPTIONS='--import ./test-helpers/december-waste-mock-date.js'. Used by the integration
// server so date-dependent behaviour, such as the December waste flash, is
// deterministic. `new Date()` and `Date.now()` return DECEMBER_WASTE_FLASH_DATE and do not
// advance; dates built from arguments are unaffected. Integration/local only.
const DECEMBER_WASTE_FLASH_DATE = new Date(
  process.env.DECEMBER_WASTE_FLASH_DATE ?? '2026-12-15T12:00:00Z'
).getTime()

if (Number.isNaN(DECEMBER_WASTE_FLASH_DATE)) {
  throw new Error(
    `DECEMBER_WASTE_FLASH_DATE must be a valid date, got ${JSON.stringify(process.env.DECEMBER_WASTE_FLASH_DATE)}`
  )
}

const RealDate = global.Date

global.Date = new Proxy(RealDate, {
  construct(target, args) {
    return args.length === 0
      ? new target(DECEMBER_WASTE_FLASH_DATE)
      : new target(...args)
  },
  apply() {
    return new RealDate(DECEMBER_WASTE_FLASH_DATE).toString()
  },
  get(target, prop) {
    return prop === 'now' ? () => DECEMBER_WASTE_FLASH_DATE : target[prop]
  }
})
