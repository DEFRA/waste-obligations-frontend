function isExternalOrInPageHref(href) {
  return (
    !href ||
    href.startsWith('#') ||
    href.startsWith('?') ||
    href.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(href)
  )
}

/**
 * Finds service-local anchor links that would escape a reverse proxy prefix.
 * Absolute URLs are links to another service and are deliberately ignored.
 *
 * @param {string} html
 * @param {string} forwardedPrefix
 * @returns {string[]}
 */
export function getNonPrefixedServiceLinkHrefs(html, forwardedPrefix) {
  const hrefs = [
    ...String(html).matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1/gi)
  ].map((match) => match[2])

  return hrefs.filter(
    (href) =>
      !isExternalOrInPageHref(href) &&
      href !== forwardedPrefix &&
      !href.startsWith(`${forwardedPrefix}/`)
  )
}
