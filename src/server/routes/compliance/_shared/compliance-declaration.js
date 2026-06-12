export function pickLatestDeclarationForYear(declarations, year) {
  const y = Number(year)
  const rows = (declarations ?? []).filter((d) => d?.obligationYear === y)
  return rows.length > 0
    ? rows.reduce((best, d) =>
        new Date(d.updated ?? d.created ?? 0) >
        new Date(best.updated ?? best.created ?? 0)
          ? d
          : best
      )
    : null
}
