/* eslint-disable new-cap */
// Freezes the server clock at FAKE_NOW (default 15 Dec 2026). Preload it with
// NODE_OPTIONS='--import ./test-helpers/fake-now.js'. Used by the integration
// server so date-dependent behaviour, such as the December waste flash, is
// deterministic. `new Date()` and `Date.now()` return FAKE_NOW and do not
// advance; dates built from arguments are unaffected. Integration/local only.
const FAKE_NOW = new Date(
  process.env.FAKE_NOW ?? '2026-12-15T12:00:00Z'
).getTime()

if (Number.isNaN(FAKE_NOW)) {
  throw new Error(
    `FAKE_NOW must be a valid date, got ${JSON.stringify(process.env.FAKE_NOW)}`
  )
}

const RealDate = global.Date

global.Date = new Proxy(RealDate, {
  construct(target, args) {
    return args.length === 0 ? new target(FAKE_NOW) : new target(...args)
  },
  apply() {
    return new RealDate(FAKE_NOW).toString()
  },
  get(target, prop) {
    return prop === 'now' ? () => FAKE_NOW : target[prop]
  }
})
