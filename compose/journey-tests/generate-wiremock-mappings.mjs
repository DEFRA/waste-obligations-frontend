import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outputDirectory =
  process.env.JOURNEY_TEST_WIREMOCK_MAPPINGS_DIR || '/output'

await mkdir(outputDirectory, { recursive: true })

const json = (value) => JSON.stringify(value, null, 2)
const mapping = (request, body, statusCode = 200) => ({
  Request: request,
  Response: {
    StatusCode: statusCode,
    BodyAsJson: body,
    Headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }
})
const exactParameter = (name, value) => [
  {
    Name: name,
    Matchers: [{ Name: 'ExactMatcher', Pattern: value }]
  }
]

// Mirrors compose/epr-backend-account-microservice-migrations/seed.sql in
// epr-local-environment. Account is Azure-hosted and is deliberately not
// started by the CI stack; this is the subset of its contract the frontend
// needs for the same seeded DP and CSO journeys.
const directProducer = {
  userId: '79d0deab-c22d-4c30-8082-508ff8dc1bd7',
  firstName: 'Direct',
  lastName: 'Producer',
  email: 'test+directproducer@ee.com',
  organisation: {
    id: 'e2316c5e-d434-41da-8274-494dc0762d20',
    name: 'POP QUEST LTD',
    organisationNumber: '165282'
  }
}

const complianceSchemeOperator = {
  userId: '579c319d-d552-47a2-bf4c-5a125a3183bc',
  firstName: 'First name',
  lastName: 'Last Name',
  email: 'test+17122025143216@ee.com',
  organisation: {
    id: '94bfc917-b9b6-45d7-847b-e5f500bfe198',
    name: 'Organisation Name',
    organisationNumber: '12345678'
  },
  scheme: {
    id: 'd93376e3-0681-46be-aeb4-7450a2e784d8',
    name: 'Compliance Scheme Name'
  }
}

const userOrganisationsRequest = (userId) => ({
  Path: {
    Matchers: [
      { Name: 'ExactMatcher', Pattern: '/api/users/user-organisations' }
    ]
  },
  Params: exactParameter('userId', userId),
  Methods: ['GET']
})

await writeFile(
  join(outputDirectory, 'oauth-token.json'),
  json(
    mapping(
      {
        Path: {
          Matchers: [{ Name: 'ExactMatcher', Pattern: '/oauth2/v2.0/token' }]
        },
        Methods: ['POST']
      },
      { expires_in: 3600, access_token: 'journey-test-access-token' }
    )
  )
)

await writeFile(
  join(
    outputDirectory,
    'backend-account-user-organisations-direct-producer.json'
  ),
  json(
    mapping(userOrganisationsRequest(directProducer.userId), {
      user: {
        id: directProducer.userId,
        firstName: directProducer.firstName,
        lastName: directProducer.lastName,
        email: directProducer.email,
        serviceRole: 'Approved Person',
        service: 'EPR Packaging',
        organisations: [directProducer.organisation]
      }
    })
  )
)

await writeFile(
  join(
    outputDirectory,
    'backend-account-user-organisations-compliance-scheme.json'
  ),
  json(
    mapping(userOrganisationsRequest(complianceSchemeOperator.userId), {
      user: {
        id: complianceSchemeOperator.userId,
        firstName: complianceSchemeOperator.firstName,
        lastName: complianceSchemeOperator.lastName,
        email: complianceSchemeOperator.email,
        serviceRole: 'Approved Person',
        service: 'EPR Packaging',
        organisations: [complianceSchemeOperator.organisation]
      }
    })
  )
)

await writeFile(
  join(outputDirectory, 'backend-account-compliance-schemes.json'),
  json(
    mapping(
      {
        Path: {
          Matchers: [
            {
              Name: 'ExactMatcher',
              Pattern: '/api/compliance-schemes/get-for-operator'
            }
          ]
        },
        Params: exactParameter(
          'organisationId',
          complianceSchemeOperator.organisation.id
        ),
        Methods: ['GET']
      },
      [complianceSchemeOperator.scheme]
    )
  )
)

console.log('Generated frontend Account WireMock mappings')
