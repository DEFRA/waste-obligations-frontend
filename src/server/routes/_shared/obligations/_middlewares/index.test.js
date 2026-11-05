import { describe, expect, test, vi } from 'vitest'

import * as middlewares from './index.js'
import * as constants from './constants.js'
import * as deadlineStatus from './deadline-status.js'
import * as pageLinks from './page-links.js'
import * as submittedDeclaration from './submitted-declaration.js'
import * as tableRows from './table-rows.js'

describe('obligations _middlewares index', () => {
  test('re-exports shared obligations middleware handlers', () => {
    expect(middlewares.approvedUser).toMatchObject({
      assign: 'approvedUser',
      method: expect.any(Function)
    })
    expect(middlewares.currentOrganisation).toMatchObject({
      assign: 'currentOrganisation',
      method: expect.any(Function)
    })
    expect(middlewares.organisation).toMatchObject({
      assign: 'organisation'
    })
    expect(middlewares.currentComplianceScheme).toMatchObject({
      assign: 'currentComplianceScheme',
      method: expect.any(Function)
    })
    expect(middlewares.obligationsForYear).toMatchObject({
      assign: 'obligations',
      method: expect.any(Function)
    })
    expect(middlewares.awaitingAcceptancePrns).toMatchObject({
      assign: 'awaitingAcceptancePrns',
      method: expect.any(Function)
    })
  })

  test('re-exports the view-model helper constants from their modules', () => {
    expect(middlewares.PAGE_LOCALE_BASE).toBe(constants.PAGE_LOCALE_BASE)
    expect(middlewares.DEFAULT_GLASS_REMELT_TARGET_PERCENT).toBe(
      constants.DEFAULT_GLASS_REMELT_TARGET_PERCENT
    )
  })

  test.each([
    ['buildDeadlineStatus', deadlineStatus],
    ['buildPageLinks', pageLinks],
    ['buildOrganisationFields', pageLinks],
    ['buildMaterialHref', pageLinks],
    ['buildAcceptRejectPath', pageLinks],
    ['buildSubmitCertificatePath', pageLinks],
    ['buildSubmittedDeclaration', submittedDeclaration],
    ['buildManageObligationsTableRows', tableRows],
    ['buildObligationTables', tableRows]
  ])('re-exports %s as the same function as its module', (name, source) => {
    expect(middlewares[name]).toBe(source[name])
    expect(typeof middlewares[name]).toBe('function')
  })

  describe('declarations', () => {
    function buildRequest({ params = {}, getComplianceDeclarations } = {}) {
      return {
        params,
        query: { year: 2026 },
        logger: { warn: vi.fn() },
        server: {
          app: {
            wasteObligationsApi: { getComplianceDeclarations }
          }
        }
      }
    }

    test('is assigned to request.pre.declarations', () => {
      expect(middlewares.declarations).toMatchObject({
        assign: 'declarations',
        method: expect.any(Function)
      })
    })

    test('loads the declarations for the organisation and year', async () => {
      const declarationsList = [{ id: 'd-1', status: 'Submitted' }]
      const getComplianceDeclarations = vi.fn().mockResolvedValue({
        complianceDeclarations: declarationsList
      })
      const request = buildRequest({
        params: { organisationId: 'org-1' },
        getComplianceDeclarations
      })

      await expect(middlewares.declarations.method(request)).resolves.toBe(
        declarationsList
      )
      expect(getComplianceDeclarations).toHaveBeenCalledWith('org-1', 2026)
    })

    test('uses the scheme id for a CSO route', async () => {
      const getComplianceDeclarations = vi
        .fn()
        .mockResolvedValue({ complianceDeclarations: [] })
      const request = buildRequest({
        params: { schemeId: 'scheme-1' },
        getComplianceDeclarations
      })

      await middlewares.declarations.method(request)

      expect(getComplianceDeclarations).toHaveBeenCalledWith('scheme-1', 2026)
    })

    test('logs and fails with a 500 when the API call fails', async () => {
      const request = buildRequest({
        params: { organisationId: 'org-1' },
        getComplianceDeclarations: vi
          .fn()
          .mockRejectedValue(new Error('backend down'))
      })

      await expect(
        middlewares.declarations.method(request)
      ).rejects.toMatchObject({ output: { statusCode: 500 } })
      expect(request.logger.warn).toHaveBeenCalled()
    })
  })
})
