import { afterEach, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'

import { dashWhenNoDataYet } from './no-data-yet.js'

describe('dashWhenNoDataYet', () => {
  const previous = config.get('features.manageObligations')

  afterEach(() => {
    config.set('features.manageObligations', previous)
  })

  test('is on when the Manage Obligations feature is on', () => {
    config.set('features.manageObligations', true)

    expect(dashWhenNoDataYet()).toBe(true)
  })

  test('is off when the Manage Obligations feature is off', () => {
    config.set('features.manageObligations', false)

    expect(dashWhenNoDataYet()).toBe(false)
  })
})
