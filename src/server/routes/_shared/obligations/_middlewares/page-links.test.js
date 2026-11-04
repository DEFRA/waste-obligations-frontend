import { describe, test, expect, beforeEach, afterEach } from 'vitest'

import { config } from '#/config/config.js'
import {
  buildAcceptRejectPath,
  buildMaterialHref,
  buildOrganisationFields,
  buildPageLinks,
  buildSubmitCertificatePath
} from './page-links.js'

const PREFIX = '/manage-recycling-obligations'
const plainRequest = { headers: {} }
const proxiedRequest = { headers: { 'x-forwarded-prefix': PREFIX } }
const producerContext = {
  isProducer: true,
  pathId: 'org-1',
  obligationYear: 2026
}
const csoContext = {
  isProducer: false,
  pathId: 'scheme-1',
  obligationYear: 2026
}

describe('manage-obligations page links', () => {
  let previousShowPrns

  beforeEach(() => {
    previousShowPrns = config.get('features.showPrns')
  })

  afterEach(() => {
    config.set('features.showPrns', previousShowPrns)
  })

  describe('buildAcceptRejectPath', () => {
    test('is null when PRNs are switched off', () => {
      config.set('features.showPrns', false)

      expect(buildAcceptRejectPath(plainRequest, producerContext)).toBeNull()
    })

    test('links to the producer PRN list when PRNs are on', () => {
      config.set('features.showPrns', true)

      expect(buildAcceptRejectPath(plainRequest, producerContext)).toContain(
        '/producer/org-1/'
      )
    })

    test('links to the CSO PRN list when PRNs are on', () => {
      config.set('features.showPrns', true)

      expect(buildAcceptRejectPath(plainRequest, csoContext)).toContain(
        '/cso/scheme-1/'
      )
    })

    test('adds the forwarded prefix', () => {
      config.set('features.showPrns', true)

      expect(buildAcceptRejectPath(proxiedRequest, producerContext)).toMatch(
        new RegExp(`^${PREFIX}/producer/org-1/`)
      )
    })
  })

  describe('buildSubmitCertificatePath', () => {
    test('links a producer to the certificate for the year', () => {
      expect(buildSubmitCertificatePath(plainRequest, producerContext)).toBe(
        '/producer/org-1/compliance/certificate?year=2026'
      )
    })

    test('links a CSO to the statement for the year', () => {
      expect(buildSubmitCertificatePath(plainRequest, csoContext)).toBe(
        '/cso/scheme-1/compliance/statement?year=2026'
      )
    })

    test('adds the forwarded prefix', () => {
      expect(buildSubmitCertificatePath(proxiedRequest, csoContext)).toBe(
        `${PREFIX}/cso/scheme-1/compliance/statement?year=2026`
      )
    })
  })

  describe('buildPageLinks', () => {
    test('returns the accept-reject and submit links together', () => {
      config.set('features.showPrns', false)

      expect(buildPageLinks(plainRequest, 'org-1', true, 2026)).toEqual({
        acceptRejectPath: null,
        submitCertificatePath:
          '/producer/org-1/compliance/certificate?year=2026'
      })
    })
  })

  describe('buildPageLinks with PRNs on', () => {
    test('also links to the PRN list, with the forwarded prefix', () => {
      config.set('features.showPrns', true)

      expect(buildPageLinks(proxiedRequest, 'scheme-1', false, 2026)).toEqual({
        acceptRejectPath: `${PREFIX}/cso/scheme-1/prns?year=2026`,
        submitCertificatePath: `${PREFIX}/cso/scheme-1/compliance/statement?year=2026`
      })
    })
  })

  describe('buildOrganisationFields', () => {
    const organisation = { name: 'Best Foods Ltd' }

    test('names the business for a producer', () => {
      expect(buildOrganisationFields(organisation, true)).toEqual({
        organisationName: 'Best Foods Ltd',
        complianceSchemeName: null
      })
    })

    test('names the scheme for a CSO', () => {
      expect(buildOrganisationFields(organisation, false)).toEqual({
        organisationName: null,
        complianceSchemeName: 'Best Foods Ltd'
      })
    })

    test('tolerates a missing organisation', () => {
      expect(buildOrganisationFields(undefined, true)).toEqual({
        organisationName: undefined,
        complianceSchemeName: null
      })
    })
  })

  describe('buildMaterialHref', () => {
    test('links a material row to its producer calculation page', () => {
      const materialHref = buildMaterialHref(plainRequest, producerContext)

      expect(materialHref({ material: 'Plastic' })).toBe(
        '/producer/org-1/obligations/plastic?year=2026'
      )
    })

    test('links a material row to its CSO calculation page with the prefix', () => {
      const materialHref = buildMaterialHref(proxiedRequest, csoContext)

      expect(materialHref({ material: 'Plastic' })).toBe(
        `${PREFIX}/cso/scheme-1/obligations/plastic?year=2026`
      )
    })

    test('returns undefined for a row with no calculation page', () => {
      const materialHref = buildMaterialHref(plainRequest, producerContext)

      expect(materialHref({ material: 'Not a material' })).toBeUndefined()
    })
  })
})
