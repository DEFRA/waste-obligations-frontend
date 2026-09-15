export function validatePublicOrigin(value) {
  const url = new URL(value)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    (value !== url.origin && value !== `${url.origin}/`)
  ) {
    throw new Error(
      'Must be an HTTP(S) origin without credentials, path, query or fragment'
    )
  }
}
