import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  clearSelectedPrnsFromSession,
  getSelectedPrnIdsFromSession,
  getSelectedPrnsDataFromSession,
  getSelectedPrnsListQueryFromSession,
  pickListQuery,
  removeSelectedPrnIdFromSession,
  setSelectedPrnIdsInSession,
  setSelectedPrnsDataInSession,
  setSelectedPrnsListQueryInSession,
  setAcceptedPrnsInSession,
  getAcceptedPrnsFromSession,
  clearAcceptedPrnsFromSession
} from './selected-prns-session.js'

function buildRequest() {
  const store = new Map()

  return {
    store,
    yar: {
      get: (key) => store.get(key),
      set: (key, value) => store.set(key, value),
      clear: (key) => store.delete(key)
    }
  }
}

describe('selected PRNs session', () => {
  test('returns an empty selection when nothing is stored', () => {
    const request = buildRequest()

    expect(getSelectedPrnIdsFromSession(request, 'producer', 'org-1')).toEqual(
      []
    )
  })

  test('ignores a non-array stored value', () => {
    const request = buildRequest()
    request.store.set('selectedPrnIds:producer:org-1', 'prn-1')

    expect(getSelectedPrnIdsFromSession(request, 'producer', 'org-1')).toEqual(
      []
    )
  })

  test('stores a de-duplicated selection per user type and path id', () => {
    const request = buildRequest()

    setSelectedPrnIdsInSession(request, 'producer', 'org-1', [
      'prn-1',
      'prn-2',
      'prn-1'
    ])

    expect(getSelectedPrnIdsFromSession(request, 'producer', 'org-1')).toEqual([
      'prn-1',
      'prn-2'
    ])
    expect(getSelectedPrnIdsFromSession(request, 'cso', 'org-1')).toEqual([])
    expect(getSelectedPrnIdsFromSession(request, 'producer', 'org-2')).toEqual(
      []
    )
  })

  test('clears the selection when set to an empty list', () => {
    const request = buildRequest()
    setSelectedPrnIdsInSession(request, 'cso', 'scheme-1', ['prn-1'])

    setSelectedPrnIdsInSession(request, 'cso', 'scheme-1', [])

    expect(request.store.has('selectedPrnIds:cso:scheme-1')).toBe(false)
  })

  test('removes a single PRN from the selection', () => {
    const request = buildRequest()
    setSelectedPrnIdsInSession(request, 'cso', 'scheme-1', ['prn-1', 'prn-2'])

    removeSelectedPrnIdFromSession(request, 'cso', 'scheme-1', 'prn-1')

    expect(getSelectedPrnIdsFromSession(request, 'cso', 'scheme-1')).toEqual([
      'prn-2'
    ])
  })

  test('clears the selection when the last PRN is removed', () => {
    const request = buildRequest()
    setSelectedPrnIdsInSession(request, 'cso', 'scheme-1', ['prn-1'])

    removeSelectedPrnIdFromSession(request, 'cso', 'scheme-1', 'prn-1')

    expect(request.store.has('selectedPrnIds:cso:scheme-1')).toBe(false)
  })

  describe('PRN data', () => {
    test('returns an empty array when nothing is stored', () => {
      const request = buildRequest()

      expect(
        getSelectedPrnsDataFromSession(request, 'producer', 'org-1')
      ).toEqual([])
    })

    test('ignores a non-array stored value', () => {
      const request = buildRequest()
      request.store.set('selectedPrnsData:producer:org-1', { id: 'prn-1' })

      expect(
        getSelectedPrnsDataFromSession(request, 'producer', 'org-1')
      ).toEqual([])
    })

    test('stores the PRN data per user type and path id', () => {
      const request = buildRequest()
      const prns = [{ id: 'prn-1', status: 'AwaitingAcceptance' }]

      setSelectedPrnsDataInSession(request, 'producer', 'org-1', prns)

      expect(
        getSelectedPrnsDataFromSession(request, 'producer', 'org-1')
      ).toEqual(prns)
      expect(getSelectedPrnsDataFromSession(request, 'cso', 'org-1')).toEqual(
        []
      )
      expect(
        getSelectedPrnsDataFromSession(request, 'producer', 'org-2')
      ).toEqual([])
    })

    test('clears the data when set to an empty list', () => {
      const request = buildRequest()
      setSelectedPrnsDataInSession(request, 'cso', 'scheme-1', [
        { id: 'prn-1' }
      ])

      setSelectedPrnsDataInSession(request, 'cso', 'scheme-1', [])

      expect(request.store.has('selectedPrnsData:cso:scheme-1')).toBe(false)
    })
  })

  describe('pickListQuery', () => {
    test('keeps only the known list keys with a value', () => {
      expect(
        pickListQuery({
          year: 2026,
          sort: 'TonnageDescending',
          material: '',
          page: null,
          pageSize: 20,
          search: 'ignored'
        })
      ).toEqual({ year: 2026, sort: 'TonnageDescending', pageSize: 20 })
    })

    test('defaults to an empty query', () => {
      expect(pickListQuery()).toEqual({})
    })
  })

  describe('list query', () => {
    test('returns an empty object when nothing is stored', () => {
      const request = buildRequest()

      expect(
        getSelectedPrnsListQueryFromSession(request, 'producer', 'org-1')
      ).toEqual({})
    })

    test('ignores a non-object stored value', () => {
      const request = buildRequest()
      request.store.set('selectedPrnsListQuery:producer:org-1', 'sort=Tonnage')

      expect(
        getSelectedPrnsListQueryFromSession(request, 'producer', 'org-1')
      ).toEqual({})
    })

    test('stores only the known list query keys, per user type and path id', () => {
      const request = buildRequest()

      setSelectedPrnsListQueryInSession(request, 'producer', 'org-1', {
        year: 2026,
        sort: 'TonnageDescending',
        material: 'Plastic',
        page: 2,
        pageSize: 20,
        search: 'ignored',
        status: 'ignored'
      })

      expect(
        getSelectedPrnsListQueryFromSession(request, 'producer', 'org-1')
      ).toEqual({
        year: 2026,
        sort: 'TonnageDescending',
        material: 'Plastic',
        page: 2,
        pageSize: 20
      })
      expect(
        getSelectedPrnsListQueryFromSession(request, 'cso', 'org-1')
      ).toEqual({})
      expect(
        getSelectedPrnsListQueryFromSession(request, 'producer', 'org-2')
      ).toEqual({})
    })

    test('omits undefined, null and empty-string entries', () => {
      const request = buildRequest()

      setSelectedPrnsListQueryInSession(request, 'producer', 'org-1', {
        year: 2026,
        sort: undefined,
        material: null,
        page: ''
      })

      expect(
        getSelectedPrnsListQueryFromSession(request, 'producer', 'org-1')
      ).toEqual({ year: 2026 })
    })

    test('defaults the query to an empty object', () => {
      const request = buildRequest()

      setSelectedPrnsListQueryInSession(request, 'producer', 'org-1')

      expect(
        getSelectedPrnsListQueryFromSession(request, 'producer', 'org-1')
      ).toEqual({})
    })
  })

  describe('clearing the selection', () => {
    test('clears the ids, PRN data and list query for that user type and path id only', () => {
      const request = buildRequest()
      for (const [userType, pathId] of [
        ['producer', 'org-1'],
        ['producer', 'org-2']
      ]) {
        setSelectedPrnIdsInSession(request, userType, pathId, ['prn-1'])
        setSelectedPrnsDataInSession(request, userType, pathId, [
          { id: 'prn-1' }
        ])
        setSelectedPrnsListQueryInSession(request, userType, pathId, {
          year: 2026
        })
      }

      clearSelectedPrnsFromSession(request, 'producer', 'org-1')

      expect([...request.store.keys()].sort()).toEqual([
        'selectedPrnIds:producer:org-2',
        'selectedPrnsData:producer:org-2',
        'selectedPrnsListQuery:producer:org-2'
      ])
    })
  })

  describe('accepted PRNs', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    test('stores only the material, tonnage and acceptance year, per user type and path id', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
      const request = buildRequest()

      setAcceptedPrnsInSession(request, 'producer', 'org-1', [
        {
          id: 'prn-1',
          number: 'PRN001',
          material: 'Plastic',
          tonnage: 50,
          obligationYear: 2026,
          decemberWaste: false,
          issuer: { organisationName: 'Not kept' },
          additionalNotes: 'Not kept'
        }
      ])

      expect(request.store.get('acceptedPrns:producer:org-1')).toEqual([
        { material: 'Plastic', tonnage: 50, acceptanceYear: 2026 }
      ])
      expect(getAcceptedPrnsFromSession(request, 'cso', 'org-1')).toEqual([])
    })

    test('stores the year a December waste PRN is accepted into, not its obligation year', () => {
      // After the December/January window, 2026 December waste can only be
      // accepted into 2027.
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2027-03-01T12:00:00Z'))
      const request = buildRequest()

      setAcceptedPrnsInSession(request, 'producer', 'org-1', [
        {
          id: 'prn-1',
          number: 'PRN001',
          material: 'Glass',
          tonnage: 10,
          obligationYear: 2026,
          decemberWaste: true
        }
      ])

      expect(
        request.store.get('acceptedPrns:producer:org-1')[0].acceptanceYear
      ).toBe(2027)
    })

    test('reads the accepted PRNs without clearing them, until they are cleared', () => {
      const request = buildRequest()
      setAcceptedPrnsInSession(request, 'cso', 'scheme-1', [
        { id: 'prn-1', number: 'PRN001', material: 'Steel', tonnage: 5 }
      ])

      expect(
        getAcceptedPrnsFromSession(request, 'cso', 'scheme-1')
      ).toHaveLength(1)
      expect(
        getAcceptedPrnsFromSession(request, 'cso', 'scheme-1')
      ).toHaveLength(1)

      clearAcceptedPrnsFromSession(request, 'cso', 'scheme-1')

      expect(getAcceptedPrnsFromSession(request, 'cso', 'scheme-1')).toEqual([])
    })

    test('shows the accepted PRNs for ten minutes, then clears them so a later visit goes to the list', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
      const request = buildRequest()
      setAcceptedPrnsInSession(request, 'producer', 'org-1', [
        { id: 'prn-1', number: 'PRN001', material: 'Steel', tonnage: 5 }
      ])

      vi.setSystemTime(new Date('2026-06-15T12:10:00Z'))
      expect(
        getAcceptedPrnsFromSession(request, 'producer', 'org-1')
      ).toHaveLength(1)

      vi.setSystemTime(new Date('2026-06-15T12:10:01Z'))
      expect(getAcceptedPrnsFromSession(request, 'producer', 'org-1')).toEqual(
        []
      )
      expect(request.store.has('acceptedPrns:producer:org-1')).toBe(false)
      expect(request.store.has('acceptedPrnsAt:producer:org-1')).toBe(false)
    })

    test('drops accepted PRNs stored without a time, rather than showing them indefinitely', () => {
      const request = buildRequest()
      request.store.set('acceptedPrns:producer:org-1', [
        { material: 'Steel', tonnage: 5, acceptanceYear: 2026 }
      ])

      expect(getAcceptedPrnsFromSession(request, 'producer', 'org-1')).toEqual(
        []
      )
      expect(request.store.has('acceptedPrns:producer:org-1')).toBe(false)
    })

    test('ignores a non-array stored value', () => {
      const request = buildRequest()
      request.store.set('acceptedPrns:producer:org-1', 'not-a-list')

      expect(getAcceptedPrnsFromSession(request, 'producer', 'org-1')).toEqual(
        []
      )
    })
  })
})
