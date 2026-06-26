export function pickLatestDeclarationForYear(declarations, year) {
  const y = Number(year)

  return (
    (declarations ?? []).find(
      (declaration) => declaration?.obligationYear === y
    ) ?? null
  )
}

export function pickLatestSubmittedDeclarationForYear(declarations, year) {
  const y = Number(year)

  return (
    (declarations ?? []).find(
      (declaration) =>
        declaration?.obligationYear === y && declaration?.status === 'Submitted'
    ) ?? null
  )
}
