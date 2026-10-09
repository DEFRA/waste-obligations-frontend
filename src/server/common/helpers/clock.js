// Test-only override for date-dependent behaviour, such as the December
// waste flash (MO-479). DECEMBER_WASTE_FLASH_DATE must never be set in a
// deployed environment; when unset, this returns the real current time.
export function resolveNow() {
  const override = process.env.DECEMBER_WASTE_FLASH_DATE

  if (!override) {
    return new Date()
  }

  const date = new Date(override)

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `DECEMBER_WASTE_FLASH_DATE must be a valid date, got ${JSON.stringify(override)}`
    )
  }

  return date
}
