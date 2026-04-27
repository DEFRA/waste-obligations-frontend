import { config } from '#/config/config.js'

async function readJsonOrThrow(response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

function buildOrganisationSnapshot(organisation = {}) {
  return {
    companyName: organisation.name ?? null,
    organisationReference: organisation.referenceNumber ?? null,
    address: organisation.address ?? null,
    regulator: organisation.regulator ?? null
  }
}

function buildApiHeaders(apiBearerToken, apiClientId, apiClientSecret) {
  if (apiClientId && apiClientSecret) {
    const basicToken = Buffer.from(
      `${apiClientId}:${apiClientSecret}`
    ).toString('base64')
    return {
      authorization: `Basic ${basicToken}`
    }
  }

  if (!apiBearerToken) {
    return undefined
  }

  return {
    authorization: `Bearer ${apiBearerToken}`
  }
}

export const homeController = {
  async handler(request, h) {
    const {
      organisationId = '',
      year = '',
      lang = 'en',
      createDeclaration = 'false'
    } = request.query

    const wasteObligationsApiBaseUrl = config.get('wasteObligationsApiBaseUrl')
    const wasteOrganisationsApiBaseUrl = config.get(
      'wasteOrganisationsApiBaseUrl'
    )
    const wasteApiBearerToken = config.get('wasteApiBearerToken')
    const wasteApiClientId = config.get('wasteApiClientId')
    const wasteApiClientSecret = config.get('wasteApiClientSecret')
    const apiHeaders = buildApiHeaders(
      wasteApiBearerToken,
      wasteApiClientId,
      wasteApiClientSecret
    )

    const model = {
      pageTitle: 'About your certificate & statement',
      heading: 'About your certificate & statement',
      organisationId,
      lang,
      year,
      obligationsResponse: null,
      complianceDeclarationsResponse: null,
      organisationResponse: null,
      declarationPayloadPreview: null,
      createDeclarationRequested: createDeclaration === 'true',
      createdComplianceDeclarationResponse: null,
      errorMessage: null
    }

    if (
      !organisationId ||
      !year ||
      !wasteObligationsApiBaseUrl ||
      !wasteOrganisationsApiBaseUrl
    ) {
      return h.view('home/index', model)
    }

    try {
      const obligationsUrl = new URL(
        `/organisations/${organisationId}/obligations`,
        wasteObligationsApiBaseUrl
      )
      obligationsUrl.searchParams.set('include', 'organisation')
      obligationsUrl.searchParams.set('obligationYear', year)

      const complianceDeclarationsUrl = new URL(
        `/organisations/${organisationId}/compliance-declarations`,
        wasteObligationsApiBaseUrl
      )
      complianceDeclarationsUrl.searchParams.set('obligationYear', year)

      const organisationUrl = new URL(
        `/organisations/${organisationId}`,
        wasteOrganisationsApiBaseUrl
      )

      const [
        obligationsResponse,
        complianceDeclarationsResponse,
        organisationResponse
      ] = await Promise.all([
        fetch(obligationsUrl, { headers: apiHeaders }),
        fetch(complianceDeclarationsUrl, { headers: apiHeaders }),
        fetch(organisationUrl, { headers: apiHeaders })
      ])

      model.obligationsResponse = await readJsonOrThrow(obligationsResponse)
      model.complianceDeclarationsResponse = await readJsonOrThrow(
        complianceDeclarationsResponse
      )
      model.organisationResponse = await readJsonOrThrow(organisationResponse)

      model.declarationPayloadPreview = {
        obligationYear: Number(year),
        declarationText: {
          text: 'I confirm this statement is correct',
          language: lang
        },
        submitterName: '',
        user: {
          id: '',
          email: ''
        },
        organisation: buildOrganisationSnapshot(model.organisationResponse)
      }

      if (model.createDeclarationRequested) {
        const createComplianceDeclarationResponse = await fetch(
          new URL(
            `/organisations/${organisationId}/compliance-declarations`,
            wasteObligationsApiBaseUrl
          ),
          {
            method: 'POST',
            headers: {
              ...apiHeaders,
              'content-type': 'application/json'
            },
            body: JSON.stringify(model.declarationPayloadPreview)
          }
        )

        model.createdComplianceDeclarationResponse = await readJsonOrThrow(
          createComplianceDeclarationResponse
        )
      }
    } catch (error) {
      model.errorMessage = error.message
    }

    return h.view('home/index', model)
  }
}
