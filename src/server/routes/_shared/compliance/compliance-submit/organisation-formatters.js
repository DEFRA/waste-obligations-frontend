export function formatOrganisationAddress(address) {
  if (address == null) {
    return ''
  }

  if (typeof address !== 'object') {
    return String(address).trim()
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.town,
    address.county,
    address.postcode,
    address.country
  ]
    .filter(Boolean)
    .map((p) => p.toString().trim())
    .filter(Boolean)
    .join(', ')
}

export function formatOrganisationName(organisation, year) {
  if (organisation == null || typeof organisation !== 'object') {
    return ''
  }

  const registrations = organisation.registrations ?? []
  const matchingRegistrations = registrations
    .filter((x) => x.registrationYear === Number(year))
    .sort((a, b) => new Date(b.updated) - new Date(a.updated))
  const registration =
    matchingRegistrations.find((x) => x.status === 'REGISTERED') ??
    matchingRegistrations[0]

  if (!registration) {
    throw new Error(`No registration found, using year ${year}`)
  }

  const result = (() => {
    switch (registration.type) {
      case 'LARGE_PRODUCER':
        return organisation.name

      case 'COMPLIANCE_SCHEME':
        return organisation.tradingName

      default:
        return organisation.name
    }
  })()

  return result ?? organisation.name
}

export function formatSchemeOperatorName(organisation) {
  return organisation?.name ?? ''
}
