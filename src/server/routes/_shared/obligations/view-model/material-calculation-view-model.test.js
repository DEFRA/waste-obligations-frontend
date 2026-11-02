import { describe, expect, test } from 'vitest'

import { PRODUCER_RESPONSIBILITY_REGULATIONS_URL } from '#/config/constants.js'
import { buildMaterialCalculationViewModel } from './material-calculation-view-model.js'

function tonnages(material, obligated, extra = {}) {
  return {
    material,
    awaitingAcceptance: 5,
    accepted: 20,
    outstanding: Math.max(obligated - 20, 0),
    obligated,
    ...extra
  }
}

const aluminium = {
  material: 'Aluminium',
  recyclingTarget: 0.62,
  tonnages: tonnages(100, 62),
  status: 'NotMet'
}
const glassRemelt = {
  material: 'GlassRemelt',
  recyclingTarget: 0.76,
  tonnages: tonnages(100, 61),
  status: 'NotMet'
}
const glassRemaining = {
  material: 'Glass',
  recyclingTarget: 0.8,
  tonnages: tonnages(1000, 19),
  status: 'NotMet'
}

function buildRequest({
  userType = 'producer',
  obligations = [aluminium],
  locale,
  businessCountry = 'GB-ENG',
  headers = {}
} = {}) {
  const isProducer = userType === 'producer'

  return {
    params: isProducer
      ? { organisationId: 'org-uuid-1' }
      : { schemeId: 'scheme-uuid-1' },
    query: {},
    headers,
    yar: { get: (key) => (key === 'locale' ? locale : null), set: () => {} },
    pre: {
      organisation: {
        name: isProducer ? 'Best Foods Ltd' : 'Green Compliance Scheme',
        businessCountry
      },
      obligations
    }
  }
}

function build(overrides = {}, material = 'aluminium') {
  const request = buildRequest(overrides)

  return buildMaterialCalculationViewModel({
    request,
    userType: overrides.userType ?? 'producer',
    obligationYear: 2026,
    material
  })
}

describe('buildMaterialCalculationViewModel', () => {
  test('names the page for the year and the material', () => {
    const result = build()

    expect(result.title).toBe('Your 2026 recycling obligation for aluminium')
    expect(result.obligationYear).toBe(2026)
    expect(result.materialName).toBe('aluminium')
    expect(result.isGlass).toBe(false)
  })

  test('shows the organisation name for a producer and the scheme name for a compliance scheme', () => {
    const producer = build()
    const cso = build({ userType: 'cso' })

    expect(producer.organisationName).toBe('Best Foods Ltd')
    expect(producer.complianceSchemeName).toBeNull()
    expect(cso.organisationName).toBeNull()
    expect(cso.complianceSchemeName).toBe('Green Compliance Scheme')
  })

  test.each([
    ['GB-ENG', 'Environment Agency (England)'],
    ['GB-SCT', 'Scottish Environment Protection Agency (Scotland)'],
    ['GB-WLS', 'Natural Resources Wales (Wales)'],
    ['GB-NIR', 'Northern Ireland Environment Agency (Northern Ireland)']
  ])('names the regulator for %s without "The"', (businessCountry, name) => {
    expect(build({ businessCountry }).regulatorName).toBe(name)
  })

  test('names paper as paper, board or fibre-based composite material', () => {
    const result = build(
      { obligations: [{ ...aluminium, material: 'Paper' }] },
      'paper'
    )

    expect(result.materialName).toBe(
      'paper, board or fibre-based composite material'
    )
  })

  test('shows only the viewed material in the table, with no link and no totals row', () => {
    const result = build({
      obligations: [aluminium, { ...aluminium, material: 'Steel' }]
    })

    expect(result.tableRows).toHaveLength(1)
    expect(result.tableRows[0][0].html).toBe('<strong>Aluminium</strong>')
    expect(result.tableRows[0].map((cell) => cell.text)).toEqual([
      undefined,
      '62',
      '5',
      '20',
      '42',
      undefined
    ])
    expect(result.tableRows[0][5].html).toContain('Not met')
  })

  test('works the written example out from the reported tonnage and the target', () => {
    const result = build({
      obligations: [
        {
          ...aluminium,
          recyclingTarget: 0.62,
          tonnages: tonnages(1234, 765)
        }
      ]
    })

    expect(result.calculation).toEqual({
      type: 'standard',
      regulationsYear: 2024,
      reportedTonnage: '1,234',
      targetPercent: 62,
      obligationTonnage: '765'
    })
  })

  test('has no written example when no tonnage was reported', () => {
    const result = build({
      obligations: [{ ...aluminium, tonnages: tonnages(0, 0) }]
    })

    expect(result.calculation).toBeNull()
  })

  test('links back to the obligations home for the same year, under the forwarded prefix', () => {
    const result = build({
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })
    const cso = build({ userType: 'cso' })

    expect(result.backLink).toBe(
      '/manage-recycling-obligations/producer/org-uuid-1/obligations?year=2026'
    )
    expect(cso.backLink).toBe('/cso/scheme-uuid-1/obligations?year=2026')
  })

  test('uses the configured regulations link', () => {
    expect(build().regulationsUrl).toBe(PRODUCER_RESPONSIBILITY_REGULATIONS_URL)
  })

  test('words the table as the Azure page does, in Welsh', () => {
    const result = build({ locale: 'cy' })

    expect(result.tableRows[0][0].html).toBe('<strong>Alwminiwm</strong>')
    expect(result.tableRows[0][5].html).toContain('Heb ei gyflawni')
  })

  test('uses the Welsh names and title when the user chose Welsh', () => {
    const result = build({ locale: 'cy' })

    expect(result.materialName).toBe('alwminiwm')
    expect(result.title).toBe(
      'Eich rhwymedigaeth ailgylchu ar gyfer 2026 ar gyfer alwminiwm'
    )
  })

  test('shows an empty table and no example when the material has no obligation', () => {
    const result = build({ obligations: [] })

    expect(result.tableRows).toEqual([])
    expect(result.calculation).toBeNull()
  })

  test('copes with an obligations response that is missing', () => {
    const request = buildRequest()
    request.pre.obligations = undefined

    const result = buildMaterialCalculationViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026,
      material: 'aluminium'
    })

    expect(result.tableRows).toEqual([])
    expect(result.calculation).toBeNull()
  })

  test('works out a material with no target or obligated tonnage as zero', () => {
    const result = build({
      obligations: [
        {
          material: 'Aluminium',
          tonnages: { material: 5, awaitingAcceptance: 0, accepted: 0 },
          status: 'NotMet'
        }
      ]
    })

    expect(result.calculation).toEqual({
      type: 'standard',
      regulationsYear: 2024,
      reportedTonnage: '5',
      targetPercent: 0,
      obligationTonnage: '0'
    })
  })

  describe('glass', () => {
    test('has no example when there is no glass obligation', () => {
      const result = build({ obligations: [aluminium] }, 'glass')

      expect(result.calculation).toBeNull()
      expect(result.tableRows).toHaveLength(3)
    })

    test('works the example out when only the remaining glass has an obligation', () => {
      const result = build({ obligations: [glassRemaining] }, 'glass')

      expect(result.calculation).toMatchObject({
        type: 'glass',
        remeltTargetPercent: 0,
        remeltObligationTonnage: '0',
        totalObligationTonnage: '19'
      })
    })

    test('works the example out when only the re-melt has an obligation', () => {
      const result = build({ obligations: [glassRemelt] }, 'glass')

      expect(result.calculation).toMatchObject({
        type: 'glass',
        reportedTonnage: '0',
        totalTargetPercent: 0,
        remeltObligationTonnage: '61'
      })
    })

    const glass = [glassRemelt, glassRemaining]

    test('shows re-melt, remaining glass and totals rows', () => {
      const result = build({ obligations: glass }, 'glass')

      expect(result.isGlass).toBe(true)
      expect(result.materialName).toBe('glass')
      expect(result.tableRows.map((row) => row[0].html)).toEqual([
        '<strong>Glass re-melt</strong>',
        '<strong>Remaining glass</strong>',
        '<strong>Totals</strong>'
      ])
      expect(result.tableRows[2].map((cell) => cell.text)[1]).toBe('80')
    })

    test('works the glass example out from the remaining glass tonnage and both targets', () => {
      const result = build({ obligations: glass }, 'glass')

      expect(result.calculation).toEqual({
        type: 'glass',
        regulationsYear: 2024,
        reportedYear: 2026,
        reportedTonnage: '1000',
        totalTargetPercent: 80,
        remeltTargetPercent: 76,
        totalObligationTonnage: '80',
        remeltObligationTonnage: '61',
        remainingObligationTonnage: '19'
      })
    })
  })
})
