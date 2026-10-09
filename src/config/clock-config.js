export const CDP_ENVIRONMENTS = [
  'local',
  'infra-dev',
  'management',
  'dev',
  'test',
  'perf-test',
  'ext-test',
  'prod'
]

export function createClockConfig() {
  return {
    cdpEnvironment: {
      doc: 'The CDP environment the app is running in, injected by CDP; local when run outside CDP',
      format: CDP_ENVIRONMENTS,
      default: 'local',
      env: 'ENVIRONMENT'
    },
    startupUtcTimestampOverride: {
      doc: 'Local testing only: RFC 3339 timestamp the date-dependent UI logic (e.g. the December waste flash) starts at; time then advances as usual. Ignored outside the local environment. Never set in a CDP environment.',
      format: String,
      nullable: true,
      default: null,
      env: 'STARTUP_UTC_TIMESTAMP_OVERRIDE'
    }
  }
}
