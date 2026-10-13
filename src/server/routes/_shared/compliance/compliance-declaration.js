export function pickLatestDeclarationForYear(declarations, year) {
  const y = Number(year)

  return (
    (declarations ?? []).find(
      (declaration) => declaration?.obligationYear === y
    ) ?? null
  )
}

// A declaration the regulator has accepted is still a submitted declaration:
// the organisation must not be able to submit again for that year.
const SUBMITTED_STATUSES = new Set(['Submitted', 'Accepted'])

export function pickLatestSubmittedDeclarationForYear(declarations, year) {
  const y = Number(year)

  return (
    (declarations ?? []).find(
      (declaration) =>
        declaration?.obligationYear === y &&
        SUBMITTED_STATUSES.has(declaration?.status)
    ) ?? null
  )
}
