import { describe, expect, test, vi } from 'vitest'

import { createComplianceDeclarationAndClearCache } from './submit-service.js'

describe('createComplianceDeclarationAndClearCache', () => {
  test('creates a declaration and clears the submit cache', async () => {
    const created = { id: 'declaration-id' }
    const createComplianceDeclaration = vi.fn().mockResolvedValue(created)
    const del = vi.fn().mockResolvedValue(1)
    const request = {
      server: {
        app: {
          wasteObligationsApi: { createComplianceDeclaration },
          redisClient: { del }
        }
      }
    }
    const payload = { submitterName: 'Jane Doe' }

    await expect(
      createComplianceDeclarationAndClearCache(
        request,
        'org-id',
        'cache-key',
        payload
      )
    ).resolves.toEqual(created)

    expect(createComplianceDeclaration).toHaveBeenCalledWith('org-id', payload)
    expect(del).toHaveBeenCalledWith('cache-key')
  })
})
