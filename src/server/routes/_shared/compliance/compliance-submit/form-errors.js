export function mergeFormErrors(...errors) {
  const defined = errors.filter(Boolean)

  if (defined.length === 0) {
    return null
  }

  return {
    summary: defined.flatMap((error) => error.summary),
    fields: defined.reduce(
      (fields, error) => ({ ...fields, ...error.fields }),
      {}
    )
  }
}
