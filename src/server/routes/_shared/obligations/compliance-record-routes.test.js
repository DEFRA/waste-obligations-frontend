import { describe, expect, test, vi } from 'vitest'

import { buildComplianceRecordRoute } from './compliance-record-routes.js'
import { producerObligationsParamsSchema } from './schema.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('buildComplianceRecordRoute', () => {
  const pre = [vi.fn()]

  function build(isProducer = true) {
    return buildComplianceRecordRoute({
      path: '/producer/{organisationId}/obligations/compliance-record',
      paramsSchema: producerObligationsParamsSchema,
      pre,
      isProducer
    })
  }

  function render(controller, { businessCountry, lang } = {}) {
    const h = { view: vi.fn() }

    controller.handler(
      {
        params: { organisationId: id },
        query: lang ? { lang } : {},
        headers: {},
        yar: { get: () => null, set: () => {} },
        pre: { organisation: { id, name: 'Example Ltd', businessCountry } }
      },
      h
    )

    return h.view.mock.calls[0]
  }

  test('is a GET on the path with the given pre handlers and validated params', () => {
    const controller = build()

    expect(controller.method).toBe('GET')
    expect(controller.path).toBe(
      '/producer/{organisationId}/obligations/compliance-record'
    )
    expect(controller.options.pre).toBe(pre)
    expect(controller.options.validate.params).toBe(
      producerObligationsParamsSchema
    )
  })

  test('renders the record page for 2025 for a producer', () => {
    const [view, model] = render(build(true))

    expect(view).toBe('_shared/obligations/views/compliance-record')
    expect(model.year).toBe(2025)
    expect(model.isProducer).toBe(true)
  })

  test('marks the page as the scheme version for a compliance scheme', () => {
    const [, model] = render(build(false))

    expect(model.isProducer).toBe(false)
  })

  test.each([
    [
      'GB-ENG',
      'Environment Agency',
      'packagingproducers@environment-agency.gov.uk',
      false
    ],
    [
      'GB-SCT',
      'Scottish Environment Protection Agency',
      'producer.responsibility@sepa.org.uk',
      false
    ],
    [
      'GB-WLS',
      'Natural Resources Wales',
      'packaging@naturalresourceswales.gov.uk',
      true
    ],
    [
      'GB-NIR',
      'Northern Ireland Environment Agency',
      'packaging@daera-ni.gov.uk',
      false
    ],
    [
      undefined,
      'Environment Agency',
      'packagingproducers@environment-agency.gov.uk',
      false
    ]
  ])('names the regulator for %s', (businessCountry, name, email, isWales) => {
    const [, model] = render(build(), { businessCountry })

    expect(model.regulatorName).toBe(name)
    expect(model.regulatorEmail).toBe(email)
    expect(model.isWales).toBe(isWales)
  })
})
