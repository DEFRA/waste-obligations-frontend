import { describe, expect, test } from 'vitest'

import {
  clearSelectedPrnsFromSession,
  getSelectedPrnIdsFromSession,
  getSelectedPrnsDataFromSession,
  getSelectedPrnsListQueryFromSession,
  removeSelectedPrnIdFromSession,
  setSelectedPrnIdsInSession,
  setSelectedPrnsDataInSession,
  setSelectedPrnsListQueryInSession
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
})
