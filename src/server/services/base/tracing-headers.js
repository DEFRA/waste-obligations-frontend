export function buildTracingHeader(headerName, headerValue) {
  if (!headerName || !headerValue) {
    return {}
  }

  return { [headerName]: headerValue }
}
